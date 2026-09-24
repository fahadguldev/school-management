import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { Assessment } from '../exams/assessment.entity';
import { Fee } from '../fees/fee.entity';
import { Result } from '../results/result.entity';
import { Student } from '../students/student.entity';
import { Class } from '../classes/class.entity';
import { Teacher } from '../teachers/teacher.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Result)
    private readonly results: Repository<Result>,
    @InjectRepository(Assessment)
    private readonly assessments: Repository<Assessment>,
    @InjectRepository(Fee)
    private readonly fees: Repository<Fee>,
    @InjectRepository(Class)
    private readonly classes: Repository<Class>,
    @InjectRepository(Teacher)
    private readonly teachers: Repository<Teacher>,
    @InjectRepository(TeacherAssignment)
    private readonly assignments: Repository<TeacherAssignment>,
  ) {}

  async schoolOverview(user: AuthenticatedUser) {
    const [students, results, assessments, fees] = await Promise.all([
      this.students.count({ where: { organizationId: user.organizationId, isActive: true } }),
      this.results.find({
        where: { organizationId: user.organizationId },
        relations: { student: true, assessment: true },
      }),
      this.assessments.find({ where: { organizationId: user.organizationId } }),
      this.fees.find({ where: { organizationId: user.organizationId } }),
    ]);

    const average = results.length
      ? results.reduce((sum, result) => sum + Number(result.percentage), 0) / results.length
      : 0;
    const passRate = results.length
      ? (results.filter((result) => result.isPassed).length / results.length) * 100
      : 0;

    // Track student trends (improving vs declining)
    const studentResults = new Map<string, Result[]>();
    for (const r of results) {
      const existing = studentResults.get(r.student.id) || [];
      existing.push(r);
      studentResults.set(r.student.id, existing);
    }

    let improvingCount = 0;
    let decliningCount = 0;
    let strongCount = 0;
    let weakCount = 0;

    for (const [, list] of studentResults) {
      const studentAvg = list.reduce((sum, item) => sum + Number(item.percentage), 0) / list.length;
      if (studentAvg >= 80) strongCount++;
      if (studentAvg < 50) weakCount++;

      if (list.length >= 2) {
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const first = Number(list[0].percentage);
        const last = Number(list[list.length - 1].percentage);
        if (last > first) improvingCount++;
        else if (last < first) decliningCount++;
      }
    }

    return {
      totalStudents: students,
      assessments: assessments.length,
      overallAverage: Number(average.toFixed(2)),
      passRate: Number(passRate.toFixed(2)),
      improvingStudents: improvingCount,
      decliningStudents: decliningCount,
      strongStudents: strongCount,
      weakStudents: weakCount,
      outstandingFees: fees.filter((fee) => !fee.isPaid).length,
      paidFees: fees.filter((fee) => fee.isPaid).length,
    };
  }

  async principalClassComparison(user: AuthenticatedUser) {
    const orgClasses = await this.classes.find({
      where: { organizationId: user.organizationId, isActive: true },
      order: { name: 'ASC', section: 'ASC' },
    });

    const results = await this.results.find({
      where: { organizationId: user.organizationId },
      relations: { student: true, assessment: { class: true } },
    });

    const comparisons = orgClasses.map((cls) => {
      const classResults = results.filter((r) => r.assessment?.class?.id === cls.id);

      if (!classResults.length) {
        return {
          classId: cls.id,
          className: cls.name,
          section: cls.section,
          previous: 0,
          current: 0,
          change: 0,
          passRate: 0,
          status: 'stable',
          studentCount: 0,
        };
      }

      // Group by assessment to distinguish previous vs current term/test
      const byAssessment = new Map<string, Result[]>();
      for (const r of classResults) {
        const aId = r.assessment.id;
        const list = byAssessment.get(aId) || [];
        list.push(r);
        byAssessment.set(aId, list);
      }

      const assessmentsList = [...byAssessment.entries()].sort((a, b) => {
        const dateA = new Date(a[1][0]?.assessment?.examDate || a[1][0]?.createdAt).getTime();
        const dateB = new Date(b[1][0]?.assessment?.examDate || b[1][0]?.createdAt).getTime();
        return dateA - dateB;
      });

      let currentAvg = 0;
      let previousAvg = 0;

      if (assessmentsList.length === 1) {
        const singleSet = assessmentsList[0][1];
        currentAvg = singleSet.reduce((sum, r) => sum + Number(r.percentage), 0) / singleSet.length;
        previousAvg = currentAvg;
      } else if (assessmentsList.length > 1) {
        const latestSet = assessmentsList[assessmentsList.length - 1][1];
        const prevSet = assessmentsList[assessmentsList.length - 2][1];
        currentAvg = latestSet.reduce((sum, r) => sum + Number(r.percentage), 0) / latestSet.length;
        previousAvg = prevSet.reduce((sum, r) => sum + Number(r.percentage), 0) / prevSet.length;
      }

      const passCount = classResults.filter((r) => r.isPassed).length;
      const passRate = (passCount / classResults.length) * 100;
      const change = Number((currentAvg - previousAvg).toFixed(2));

      return {
        classId: cls.id,
        className: cls.name,
        section: cls.section,
        previous: Number(previousAvg.toFixed(2)),
        current: Number(currentAvg.toFixed(2)),
        change,
        passRate: Number(passRate.toFixed(2)),
        status: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
        studentCount: new Set(classResults.map((r) => r.student.id)).size,
      };
    });

    return {
      comparisons,
      classesImproving: comparisons.filter((c) => c.change > 0).length,
      classesDeclining: comparisons.filter((c) => c.change < 0).length,
    };
  }

  async principalTeacherPerformance(user: AuthenticatedUser) {
    const assignments = await this.assignments.find({
      where: { organizationId: user.organizationId },
      relations: { teacher: true, class: true, subject: true },
    });

    const results = await this.results.find({
      where: { organizationId: user.organizationId },
      relations: { student: true, subject: true, assessment: { class: true } },
    });

    return assignments.map((asgn) => {
      const teacherName = asgn.teacher
        ? `${asgn.teacher.firstName} ${asgn.teacher.lastName}`.trim()
        : 'Unassigned';

      const matchResults = results.filter(
        (r) =>
          r.assessment?.class?.id === asgn.class?.id &&
          r.subject?.id === asgn.subject?.id,
      );

      if (!matchResults.length) {
        return {
          teacherId: asgn.teacher?.id || '',
          teacherName,
          employeeId: asgn.teacher?.employeeId || '',
          className: asgn.class?.name || '',
          section: asgn.class?.section || '',
          subjectName: asgn.subject?.name || '',
          previousAverage: 0,
          currentAverage: 0,
          change: 0,
          passRate: 0,
          studentsImproved: 0,
          studentsDeclined: 0,
          assignedStudents: 0,
        };
      }

      // Group by assessment
      const byAssessment = new Map<string, Result[]>();
      for (const r of matchResults) {
        const aId = r.assessment.id;
        const list = byAssessment.get(aId) || [];
        list.push(r);
        byAssessment.set(aId, list);
      }

      const assessmentsList = [...byAssessment.entries()].sort((a, b) => {
        const dateA = new Date(a[1][0]?.assessment?.examDate || a[1][0]?.createdAt).getTime();
        const dateB = new Date(b[1][0]?.assessment?.examDate || b[1][0]?.createdAt).getTime();
        return dateA - dateB;
      });

      let currentAvg = 0;
      let previousAvg = 0;
      let studentsImproved = 0;
      let studentsDeclined = 0;

      if (assessmentsList.length === 1) {
        const singleSet = assessmentsList[0][1];
        currentAvg = singleSet.reduce((sum, r) => sum + Number(r.percentage), 0) / singleSet.length;
        previousAvg = currentAvg;
      } else if (assessmentsList.length > 1) {
        const latestSet = assessmentsList[assessmentsList.length - 1][1];
        const prevSet = assessmentsList[assessmentsList.length - 2][1];
        currentAvg = latestSet.reduce((sum, r) => sum + Number(r.percentage), 0) / latestSet.length;
        previousAvg = prevSet.reduce((sum, r) => sum + Number(r.percentage), 0) / prevSet.length;

        // Compare individual student movements
        const prevMap = new Map(prevSet.map((r) => [r.student.id, Number(r.percentage)]));
        for (const r of latestSet) {
          const prevScore = prevMap.get(r.student.id);
          if (prevScore !== undefined) {
            const diff = Number(r.percentage) - prevScore;
            if (diff > 0) studentsImproved++;
            else if (diff < 0) studentsDeclined++;
          }
        }
      }

      const passCount = matchResults.filter((r) => r.isPassed).length;
      const passRate = (passCount / matchResults.length) * 100;
      const change = Number((currentAvg - previousAvg).toFixed(2));

      return {
        teacherId: asgn.teacher?.id || '',
        teacherName,
        employeeId: asgn.teacher?.employeeId || '',
        className: asgn.class?.name || '',
        section: asgn.class?.section || '',
        subjectName: asgn.subject?.name || '',
        previousAverage: Number(previousAvg.toFixed(2)),
        currentAverage: Number(currentAvg.toFixed(2)),
        change,
        passRate: Number(passRate.toFixed(2)),
        studentsImproved,
        studentsDeclined,
        assignedStudents: new Set(matchResults.map((r) => r.student.id)).size,
      };
    });
  }

  async inchargeClassOverview(user: AuthenticatedUser, classIdQuery?: string) {
    let targetClass: Class | null = null;

    if (classIdQuery) {
      targetClass = await this.classes.findOne({
        where: { id: classIdQuery, organizationId: user.organizationId },
      });
    }

    if (!targetClass && user.role === 'INCHARGE') {
      const teacher = await this.teachers.findOne({
        where: { organizationId: user.organizationId, user: { id: user.id } },
      });
      if (teacher) {
        const inchargeAssignment = await this.assignments.findOne({
          where: {
            organizationId: user.organizationId,
            teacher: { id: teacher.id },
            isClassIncharge: true,
          },
          relations: { class: true },
        });
        if (inchargeAssignment?.class) {
          targetClass = inchargeAssignment.class;
        }
      }
    }

    if (!targetClass) {
      targetClass = await this.classes.findOne({
        where: { organizationId: user.organizationId, isActive: true },
        order: { name: 'ASC', section: 'ASC' },
      });
    }

    if (!targetClass) {
      return {
        classInfo: null,
        overallAverage: 0,
        passPercentage: 0,
        previousAverage: 0,
        change: 0,
        subjectAverages: [],
        studentCohorts: {
          strongStudents: [],
          weakStudents: [],
          mostImproved: [],
          decliningStudents: [],
        },
      };
    }

    // Results for this class
    const results = await this.results.find({
      where: {
        organizationId: user.organizationId,
        assessment: { class: { id: targetClass.id } },
      },
      relations: { student: true, subject: true, assessment: true },
    });

    const overallAvg = results.length
      ? results.reduce((sum, r) => sum + Number(r.percentage), 0) / results.length
      : 0;
    const passCount = results.filter((r) => r.isPassed).length;
    const passPercentage = results.length ? (passCount / results.length) * 100 : 0;

    // Group by subject
    const bySubject = new Map<string, { subjectName: string; results: Result[] }>();
    for (const r of results) {
      const sId = r.subject?.id || 'unknown';
      const sName = r.subject?.name || 'General';
      const entry = bySubject.get(sId) || { subjectName: sName, results: [] };
      entry.results.push(r);
      bySubject.set(sId, entry);
    }

    const subjectAverages = [...bySubject.entries()].map(([subjectId, data]) => {
      const avg = data.results.reduce((sum, r) => sum + Number(r.percentage), 0) / data.results.length;
      const sPass = (data.results.filter((r) => r.isPassed).length / data.results.length) * 100;
      return {
        subjectId,
        subjectName: data.subjectName,
        average: Number(avg.toFixed(2)),
        passRate: Number(sPass.toFixed(2)),
        status: avg >= 75 ? 'Strong' : avg < 60 ? 'Needs Improvement' : 'Satisfactory',
      };
    });

    // Group by student for cohorts
    const byStudent = new Map<string, { studentName: string; results: Result[] }>();
    for (const r of results) {
      const stId = r.student.id;
      const entry = byStudent.get(stId) || { studentName: r.student.name, results: [] };
      entry.results.push(r);
      byStudent.set(stId, entry);
    }

    const studentList = [...byStudent.entries()].map(([studentId, data]) => {
      const avg = data.results.reduce((sum, r) => sum + Number(r.percentage), 0) / data.results.length;
      let trend = 0;
      if (data.results.length >= 2) {
        data.results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        trend = Number(data.results[data.results.length - 1].percentage) - Number(data.results[0].percentage);
      }
      return {
        studentId,
        name: data.studentName,
        average: Number(avg.toFixed(2)),
        trend: Number(trend.toFixed(2)),
      };
    });

    const strongStudents = studentList.filter((s) => s.average >= 80);
    const weakStudents = studentList.filter((s) => s.average < 50);
    const mostImproved = [...studentList].filter((s) => s.trend > 0).sort((a, b) => b.trend - a.trend).slice(0, 5);
    const decliningStudents = [...studentList].filter((s) => s.trend < 0).sort((a, b) => a.trend - b.trend).slice(0, 5);

    return {
      classInfo: {
        id: targetClass.id,
        name: targetClass.name,
        section: targetClass.section,
      },
      overallAverage: Number(overallAvg.toFixed(2)),
      passPercentage: Number(passPercentage.toFixed(2)),
      subjectAverages,
      studentCohorts: {
        strongStudents,
        weakStudents,
        mostImproved,
        decliningStudents,
      },
    };
  }

  async studentPerformance(
    user: AuthenticatedUser,
    options: {
      evaluatorRole?: string;
      strongThreshold?: number;
      weakThreshold?: number;
      classId?: string;
      section?: string;
    } = {},
  ) {
    const strongThreshold = options.strongThreshold ?? 80;
    const weakThreshold = options.weakThreshold ?? 50;

    const results = await this.results.find({
      where: { organizationId: user.organizationId },
      relations: { student: true, subject: true, assessment: { class: true } },
    });

    const filtered = results.filter((r) => {
      if (options.classId && r.assessment?.class?.id !== options.classId) return false;
      if (options.section && r.assessment?.class?.section !== options.section) return false;
      return true;
    });

    const grouped = new Map<string, { studentName: string; admissionNumber?: string; results: Result[] }>();
    for (const result of filtered) {
      const current = grouped.get(result.student.id) ?? {
        studentName: result.student.name,
        admissionNumber: result.student.admissionNumber,
        results: [],
      };
      current.results.push(result);
      grouped.set(result.student.id, current);
    }

    const studentList = [...grouped.entries()].map(([studentId, item]) => {
      const sorted = [...item.results].sort(
        (a, b) =>
          new Date(a.assessment?.examDate || a.createdAt).getTime() -
          new Date(b.assessment?.examDate || b.createdAt).getTime(),
      );
      const percentages = sorted.map((r) => Number(r.percentage));
      const average = percentages.reduce((sum, value) => sum + value, 0) / (percentages.length || 1);

      let delta = 0;
      let previousPercentage = 0;
      let latestPercentage = 0;

      if (percentages.length === 1) {
        latestPercentage = percentages[0];
        previousPercentage = percentages[0];
        delta = 0;
      } else if (percentages.length >= 2) {
        previousPercentage = percentages[percentages.length - 2];
        latestPercentage = percentages[percentages.length - 1];
        delta = Number((latestPercentage - previousPercentage).toFixed(2));
      }

      const isStrong = average >= strongThreshold;
      const isWeak = average < weakThreshold;
      const isMostImproved = delta >= 5;
      const isDeclining = delta <= -5;

      return {
        studentId,
        studentName: item.studentName,
        admissionNumber: item.admissionNumber,
        average: Number(average.toFixed(2)),
        delta,
        trend: delta,
        previousPercentage: Number(previousPercentage.toFixed(2)),
        latestPercentage: Number(latestPercentage.toFixed(2)),
        category: isStrong ? 'strong' : isWeak ? 'weak' : 'average',
        isStrong,
        isWeak,
        isMostImproved,
        isDeclining,
        trajectory: delta > 0 ? 'improving' : delta < 0 ? 'declining' : 'stable',
        assessmentCount: percentages.length,
      };
    });

    const strongStudents = studentList.filter((s) => s.isStrong).sort((a, b) => b.average - a.average);
    const weakStudents = studentList.filter((s) => s.isWeak).sort((a, b) => a.average - b.average);
    const mostImproved = [...studentList].filter((s) => s.isMostImproved).sort((a, b) => b.delta - a.delta);
    const declining = [...studentList].filter((s) => s.isDeclining).sort((a, b) => a.delta - b.delta);

    const overallAvg =
      studentList.length > 0 ? studentList.reduce((sum, s) => sum + s.average, 0) / studentList.length : 0;

    return {
      summary: {
        totalStudents: studentList.length,
        strongCount: strongStudents.length,
        weakCount: weakStudents.length,
        mostImprovedCount: mostImproved.length,
        decliningCount: declining.length,
        overallAverage: Number(overallAvg.toFixed(2)),
        strongThreshold,
        weakThreshold,
      },
      cohorts: {
        strong: strongStudents,
        weak: weakStudents,
        mostImproved,
        declining,
      },
      students: studentList,
    };
  }
}
