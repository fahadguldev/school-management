import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from '../exams/assessment.entity';
import { Mark } from '../marks/mark.entity';
import { Student } from '../students/student.entity';
import { Result } from './result.entity';

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

    return {
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
      },
      subjects: subjectRows,
      generatedAt: new Date().toISOString(),
    };
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
