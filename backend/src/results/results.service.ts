import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from '../exams/assessment.entity';
import { Mark } from '../marks/mark.entity';
import { Student } from '../students/student.entity';
import { Result } from './result.entity';
import { AttendanceRecord } from '../attendance/attendance-record.entity';
import { Organization } from '../organizations/organization.entity';
import { ReportCardRemark } from './report-card-remark.entity';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { User } from '../users/user.entity';
import { createTextPdf, reportCardLines } from './report-card-pdf.util';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Result)
    private readonly results: Repository<Result>,
    @InjectRepository(Mark)
    private readonly marks: Repository<Mark>,
    @InjectRepository(Assessment)
    private readonly assessments: Repository<Assessment>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(AttendanceRecord)
    private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(ReportCardRemark)
    private readonly remarks: Repository<ReportCardRemark>,
  ) {}

  findByAssessment(assessmentId: string, organizationId: string) {
    return this.results.find({
      where: { assessment: { id: assessmentId }, organizationId },
      relations: { student: true, subject: true, assessment: true },
    });
  }

  async calculateForAssessment(assessmentId: string, organizationId: string): Promise<Result[]> {
    const assessment = await this.assessments.findOne({
      where: { id: assessmentId, organizationId },
      relations: { subject: true },
    });

    if (!assessment) {
      return [];
    }

    const marks = await this.marks.find({
      where: { assessment: { id: assessmentId }, organizationId },
      relations: { student: true, subject: true, assessment: true },
    });

    const scoredMarks = marks.filter((mark) => !mark.isAbsent);
    const classAverage = scoredMarks.length
      ? scoredMarks.reduce((sum, mark) => sum + Number(mark.obtainedMarks), 0) / scoredMarks.length
      : 0;

    await this.results.delete({ assessment: { id: assessmentId }, organizationId });

    const calculated = marks.map((mark) => {
      const obtainedMarks = mark.isAbsent ? 0 : Number(mark.obtainedMarks);
      const percentage = assessment.maximumMarks
        ? (obtainedMarks / Number(assessment.maximumMarks)) * 100
        : 0;

      return this.results.create({
        organizationId,
        student: mark.student,
        subject: mark.subject,
        assessment,
        obtainedMarks,
        percentage,
        grade: this.gradeFor(percentage),
        isPassed: obtainedMarks >= Number(assessment.passingMarks),
        subjectAverage: classAverage,
        classAverage,
      });
    });

    return this.results.save(calculated);
  }

  /**
   * Generates a composite, multi-subject report card summary for a student.
   * Aggregates total obtained marks, maximum marks, overall percentage, letter grade, and pass/fail status.
   */
  async getStudentReportCardSummary(
    studentId: string,
    organizationId: string,
    termId?: string,
  ) {
    const student = await this.students.findOne({
      where: { id: studentId, organizationId },
      relations: { enrollments: { class: true } },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const where: any = {
      organizationId,
      student: { id: studentId },
    };

    const results = await this.results.find({
      where,
      relations: { subject: true, assessment: { term: true, class: true } },
      order: { createdAt: 'DESC' },
    });

    // If termId provided, filter
    const filteredResults = termId
      ? results.filter((r) => r.assessment?.term?.id === termId)
      : results;

    const subjectRows = filteredResults.map((r) => {
      const maxMarks = Number(r.assessment?.maximumMarks || 100);
      const passingMarks = Number(r.assessment?.passingMarks || 40);
      const obtained = Number(r.obtainedMarks);
      const pct = Number(r.percentage);

      return {
        resultId: r.id,
        assessmentId: r.assessment?.id,
        assessmentName: r.assessment?.name,
        assessmentType: r.assessment?.type,
        termName: r.assessment?.term?.name || 'General Term',
        subjectId: r.subject?.id,
        subjectName: r.subject?.name,
        subjectCode: r.subject?.code,
        obtainedMarks: obtained,
        maximumMarks: maxMarks,
        passingMarks,
        percentage: pct,
        grade: r.grade,
        isPassed: r.isPassed,
        classAverage: Number(r.classAverage || 0),
      };
    });

    const totalObtained = subjectRows.reduce((sum, r) => sum + r.obtainedMarks, 0);
    const totalMaximum = subjectRows.reduce((sum, r) => sum + r.maximumMarks, 0);
    const overallPercentage =
      totalMaximum > 0 ? Number(((totalObtained / totalMaximum) * 100).toFixed(2)) : 0;
    const overallGrade = this.gradeFor(overallPercentage);
    const subjectsPassed = subjectRows.filter((r) => r.isPassed).length;
    const subjectsFailed = subjectRows.filter((r) => !r.isPassed).length;
    const overallPassed = subjectsFailed === 0 && subjectRows.length > 0;

    const attendance = await this.attendance.find({
      where: { organizationId, student: { id: studentId } },
      relations: { session: true },
    });
    const present = attendance.filter((record) => record.status === 'PRESENT' || record.status === 'LATE').length;
    const organization = await this.organizations.findOne({ where: { id: organizationId } });
    const remark = termId ? await this.remarks.findOne({
      where: { organizationId, student: { id: studentId }, term: { id: termId } },
    }) : null;
    const term = filteredResults[0]?.assessment?.term;
    const currentClassId = filteredResults[0]?.assessment?.class?.id;
    const peerResults = currentClassId ? await this.results.find({
      where: { organizationId, assessment: { class: { id: currentClassId } } },
      relations: { student: true, assessment: { term: true } },
    }) : [];
    const peerFiltered = termId ? peerResults.filter((item) => item.assessment?.term?.id === termId) : peerResults;
    const peerTotals = new Map<string, number[]>();
    peerFiltered.forEach((item) => {
      const list = peerTotals.get(item.student.id) || [];
      list.push(Number(item.percentage));
      peerTotals.set(item.student.id, list);
    });
    const ranked = [...peerTotals].map(([id, values]) => ({ id, average: values.reduce((a, b) => a + b, 0) / values.length }))
      .sort((a, b) => b.average - a.average);
    const classPosition = ranked.findIndex((item) => item.id === studentId) + 1;

    const studentTermGroups = new Map<string, { order: number; name: string; values: number[] }>();
    results.forEach((item) => {
      const key = item.assessment?.term?.id || 'general';
      const group = studentTermGroups.get(key) || { order: item.assessment?.term?.order || 0, name: item.assessment?.term?.name || 'General', values: [] };
      group.values.push(Number(item.percentage));
      studentTermGroups.set(key, group);
    });
    const termTrend = [...studentTermGroups.values()].sort((a, b) => a.order - b.order)
      .map((group) => ({ term: group.name, percentage: Number((group.values.reduce((a, b) => a + b, 0) / group.values.length).toFixed(2)) }));
    const currentTrendIndex = term?.name ? termTrend.findIndex((item) => item.term === term.name) : termTrend.length - 1;
    const previousTrend = currentTrendIndex > 0 ? termTrend[currentTrendIndex - 1] : null;

    return {
      school: organization ? { name: organization.name, logo: organization.logo, address: organization.address, phone: organization.phone } : null,
      student: {
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        className: student.className,
        section: student.section,
      },
      summary: {
        totalSubjects: subjectRows.length,
        totalObtained,
        totalMaximum,
        overallPercentage,
        overallGrade,
        overallStatus: overallPassed ? 'PASSED' : 'FAILED',
        subjectsPassed,
        subjectsFailed,
        classPosition: classPosition || null,
      },
      subjects: subjectRows,
      term: term ? { id: term.id, name: term.name } : null,
      attendance: {
        totalDays: attendance.length,
        present,
        absent: attendance.filter((record) => record.status === 'ABSENT').length,
        late: attendance.filter((record) => record.status === 'LATE').length,
        leave: attendance.filter((record) => record.status === 'LEAVE').length,
        attendancePercentage: attendance.length ? Number(((present / attendance.length) * 100).toFixed(2)) : 0,
      },
      comparison: previousTrend ? {
        previousTerm: previousTrend.term,
        previousPercentage: previousTrend.percentage,
        delta: Number((overallPercentage - previousTrend.percentage).toFixed(2)),
      } : null,
      trend: termTrend,
      remark: remark?.remarkText || null,
      generatedAt: new Date().toISOString(),
    };
  }

  async saveRemark(studentId: string, termId: string, remarkText: string, user: AuthenticatedUser) {
    if (!remarkText?.trim()) throw new BadRequestException('remarkText is required');
    const student = await this.students.findOne({ where: { id: studentId, organizationId: user.organizationId } });
    if (!student) throw new NotFoundException('Student not found');
    const existing = await this.remarks.findOne({ where: { organizationId: user.organizationId, student: { id: studentId }, term: { id: termId } } });
    return this.remarks.save(this.remarks.create({
      ...(existing || {}),
      organizationId: user.organizationId,
      student,
      term: { id: termId } as any,
      remarkText: remarkText.trim(),
      enteredBy: { id: user.id } as User,
    }));
  }

  async reportCardPdf(studentId: string, organizationId: string, termId?: string) {
    const card = await this.getStudentReportCardSummary(studentId, organizationId, termId);
    return createTextPdf([reportCardLines(card)]);
  }

  async bulkReportCardPdf(classId: string, organizationId: string, termId?: string) {
    const students = await this.students.find({
      where: { organizationId, enrollments: { class: { id: classId }, isCurrent: true } },
    });
    const cards = await Promise.all(students.map((student) => this.getStudentReportCardSummary(student.id, organizationId, termId)));
    return createTextPdf(cards.map(reportCardLines));
  }

  private gradeFor(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }
}
