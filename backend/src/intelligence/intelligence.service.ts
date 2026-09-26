import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { AttendanceRecord } from '../attendance/attendance-record.entity';
import { StaffAttendanceRecord } from '../attendance/staff-attendance-record.entity';
import { Class } from '../classes/class.entity';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { Fee } from '../fees/fee.entity';
import { Payment } from '../fees/payment.entity';
import { Organization } from '../organizations/organization.entity';
import { Result } from '../results/result.entity';
import { Teacher } from '../teachers/teacher.entity';
import { User } from '../users/user.entity';
import { PrincipalAlert } from './principal-alert.entity';

@Injectable()
export class IntelligenceService {
  private readonly cache = new Map<string, { expires: number; value: any }>();

  constructor(
    @InjectRepository(Result) private readonly results: Repository<Result>,
    @InjectRepository(Class) private readonly classes: Repository<Class>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(TeacherAssignment) private readonly assignments: Repository<TeacherAssignment>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(StaffAttendanceRecord) private readonly staffAttendance: Repository<StaffAttendanceRecord>,
    @InjectRepository(Fee) private readonly fees: Repository<Fee>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(PrincipalAlert) private readonly alerts: Repository<PrincipalAlert>,
  ) {}

  async threshold(metric: 'passRate' | 'attendance' | 'feeCollection' | 'improvement', value: number, user: AuthenticatedUser) {
    const key = `${user.organizationId}:threshold:${metric}`;
    const rows = await this.cached(key, () => this.classMetrics(user.organizationId));
    return {
      metric,
      threshold: value,
      matches: rows.filter((row: any) => Number(row[metric]) < value).map((row: any) => ({
        classId: row.classId,
        className: row.className,
        section: row.section,
        currentValue: row[metric],
        gap: Number((value - Number(row[metric])).toFixed(2)),
        detailUrl: `/classes/${row.classId}?view=${metric}`,
      })).sort((a: any, b: any) => b.gap - a.gap),
    };
  }

  async teacherLeaderboard(user: AuthenticatedUser, subjectId?: string, className?: string) {
    const assignments = await this.assignments.find({
      where: { organizationId: user.organizationId },
      relations: { teacher: true, class: true, subject: true },
    });
    const results = await this.resultRows(user.organizationId);
    const rows = assignments.filter((assignment) => !subjectId || assignment.subject.id === subjectId)
      .filter((assignment) => !className || assignment.class?.name === className)
      .map((assignment) => {
        const relevant = results.filter((result) => result.assessment.class?.id === assignment.class?.id && result.subject?.id === assignment.subject.id);
        const series = this.assessmentSeries(relevant);
        const current = series.at(-1)?.average || 0;
        const previous = series.at(-2)?.average ?? current;
        const tenureYears = assignment.teacher.hireDate
          ? (Date.now() - new Date(assignment.teacher.hireDate).getTime()) / (365.25 * 86400000)
          : 0;
        return {
          teacherId: assignment.teacher.id,
          teacherName: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`.trim(),
          subjectId: assignment.subject.id,
          subjectName: assignment.subject.name,
          classId: assignment.class?.id,
          className: assignment.class?.name,
          section: assignment.class?.section,
          currentAverage: current,
          previousAverage: previous,
          improvement: Number((current - previous).toFixed(2)),
          tenureBand: tenureYears < 1 ? 'FIRST_YEAR' : 'TWO_PLUS_YEARS',
        };
      }).sort((a, b) => b.improvement - a.improvement);
    return rows.map((row, index) => ({ rank: index + 1, ...row }));
  }

  async gradingPatterns(user: AuthenticatedUser) {
    const leaderboard = await this.teacherLeaderboard(user);
    return leaderboard.map((row) => {
      const peers = leaderboard.filter((peer) => peer.subjectId === row.subjectId && peer.className === row.className);
      const schoolAverage = peers.length ? peers.reduce((sum, peer) => sum + peer.currentAverage, 0) / peers.length : row.currentAverage;
      const deviation = row.currentAverage - schoolAverage;
      return {
        ...row,
        comparisonAverage: Number(schoolAverage.toFixed(2)),
        deviation: Number(deviation.toFixed(2)),
        flag: deviation >= 10 ? 'UNUSUALLY_HIGH' : deviation <= -10 ? 'UNUSUALLY_LOW' : 'NORMAL',
      };
    }).filter((row) => row.flag !== 'NORMAL');
  }

  async teacherDeepDive(teacherId: string, user: AuthenticatedUser) {
    const teacher = await this.teachers.findOne({ where: { id: teacherId, organizationId: user.organizationId } });
    if (!teacher) throw new NotFoundException('Teacher not found');
    const leaderboard = await this.teacherLeaderboard(user);
    const assigned = leaderboard.filter((row) => row.teacherId === teacherId);
    const results = await this.resultRows(user.organizationId);
    const relevant = results.filter((result) => assigned.some((row) => row.classId === result.assessment.class?.id && row.subjectId === result.subject?.id));
    const trendMap = new Map<string, number[]>();
    relevant.forEach((result) => {
      const key = result.assessment.term?.name || result.assessment.name;
      const values = trendMap.get(key) || [];
      values.push(Number(result.percentage));
      trendMap.set(key, values);
    });
    const subjectRows = [...new Set(assigned.map((row) => row.subjectName))].map((name) => {
      const rows = assigned.filter((row) => row.subjectName === name);
      return { subject: name, average: Number((rows.reduce((sum, row) => sum + row.currentAverage, 0) / rows.length).toFixed(2)) };
    }).sort((a, b) => b.average - a.average);
    return {
      teacher: { id: teacher.id, name: `${teacher.firstName} ${teacher.lastName}`.trim(), employeeId: teacher.employeeId },
      tenureBand: assigned[0]?.tenureBand || 'FIRST_YEAR',
      assignments: assigned,
      trend: [...trendMap].slice(-4).map(([term, values]) => ({ term, average: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) })),
      strongestSubject: subjectRows[0] || null,
      weakestSubject: subjectRows.at(-1) || null,
      export: { format: 'json', generatedAt: new Date().toISOString() },
    };
  }

  async sectionGaps(user: AuthenticatedUser, minimumGap = 10) {
    const metrics = await this.classMetrics(user.organizationId);
    const groups = new Map<string, any[]>();
    metrics.forEach((row) => { const list = groups.get(row.className) || []; list.push(row); groups.set(row.className, list); });
    return [...groups].flatMap(([className, sections]) => {
      if (sections.length < 2) return [];
      const sorted = [...sections].sort((a, b) => b.averageScore - a.averageScore);
      const gap = sorted[0].averageScore - sorted.at(-1).averageScore;
      return gap >= minimumGap ? [{
        className,
        strongestSection: sorted[0].section,
        weakestSection: sorted.at(-1).section,
        gap: Number(gap.toFixed(2)),
        persistent: sorted[0].improvement >= sorted.at(-1).improvement,
        detailUrl: `/classes/${sorted.at(-1).classId}?view=performance`,
      }] : [];
    });
  }

  async weakSubjects(user: AuthenticatedUser) {
    const rows = await this.resultRows(user.organizationId);
    const groups = new Map<string, { name: string; values: number[] }>();
    rows.forEach((result) => {
      if (!result.subject) return;
      const group = groups.get(result.subject.id) || { name: result.subject.name, values: [] };
      group.values.push(Number(result.percentage));
      groups.set(result.subject.id, group);
    });
    return [...groups].map(([subjectId, group]) => ({
      subjectId,
      subjectName: group.name,
      average: Number((group.values.reduce((a, b) => a + b, 0) / group.values.length).toFixed(2)),
      resultCount: group.values.length,
    })).sort((a, b) => a.average - b.average);
  }

  async atRiskStudents(user: AuthenticatedUser) {
    const rows = await this.resultRows(user.organizationId);
    const grouped = new Map<string, Result[]>();
    rows.forEach((result) => { const list = grouped.get(result.student.id) || []; list.push(result); grouped.set(result.student.id, list); });
    const risks = [];
    for (const [studentId, studentResults] of grouped) {
      const series = this.assessmentSeries(studentResults);
      let consecutiveDrops = 0;
      for (let i = series.length - 1; i > 0; i--) {
        if (series[i].average < series[i - 1].average) consecutiveDrops++;
        else break;
      }
      if (consecutiveDrops < 2) continue;
      const attendance = await this.attendance.find({ where: { organizationId: user.organizationId, student: { id: studentId } } });
      const absent = attendance.filter((record) => record.status === 'ABSENT').length;
      const absenceRate = attendance.length ? (absent / attendance.length) * 100 : 0;
      risks.push({
        studentId,
        studentName: studentResults[0].student.name,
        className: studentResults.at(-1)?.assessment.class?.name,
        section: studentResults.at(-1)?.assessment.class?.section,
        consecutiveDrops,
        currentAverage: series.at(-1)?.average || 0,
        totalDecline: Number(((series.at(-1)?.average || 0) - (series.at(-(consecutiveDrops + 1))?.average || 0)).toFixed(2)),
        absenceRate: Number(absenceRate.toFixed(2)),
        attendancePerformanceRisk: absenceRate >= 20,
        detailUrl: `/students/${studentId}/history`,
      });
    }
    return risks.sort((a, b) => a.totalDecline - b.totalDecline);
  }

  async feeDefaultRisk(user: AuthenticatedUser) {
    const fees = await this.fees.find({ where: { organizationId: user.organizationId }, relations: { student: true } });
    const groups = new Map<string, Fee[]>();
    fees.forEach((fee) => { const list = groups.get(fee.student.id) || []; list.push(fee); groups.set(fee.student.id, list); });
    return [...groups].map(([studentId, studentFees]) => {
      const late = studentFees.filter((fee) => fee.paymentDate && new Date(fee.paymentDate) > new Date(fee.dueDate)).length;
      const unpaidPastDue = studentFees.filter((fee) => !fee.isPaid && new Date(fee.dueDate) < new Date()).length;
      return {
        studentId,
        studentName: studentFees[0].student.name,
        className: studentFees[0].student.className,
        section: studentFees[0].student.section,
        historicalLatePayments: late,
        unpaidPastDue,
        riskScore: late * 2 + unpaidPastDue * 3,
      };
    }).filter((row) => row.historicalLatePayments > 0 || row.unpaidPastDue > 0).sort((a, b) => b.riskScore - a.riskScore);
  }

  async trends(user: AuthenticatedUser) {
    const rows = await this.resultRows(user.organizationId);
    const groups = new Map<string, Result[]>();
    rows.forEach((result) => {
      const key = `${result.assessment.academicYear?.name || 'Unknown'}:${result.assessment.term?.order || 0}:${result.assessment.term?.name || result.assessment.name}`;
      const list = groups.get(key) || [];
      list.push(result);
      groups.set(key, list);
    });
    return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([key, values]) => ({
      period: key.split(':').at(-1),
      academicYear: values[0].assessment.academicYear?.name || 'Unknown',
      averageScore: Number((values.reduce((sum, result) => sum + Number(result.percentage), 0) / values.length).toFixed(2)),
      passRate: Number(((values.filter((result) => result.isPassed).length / values.length) * 100).toFixed(2)),
    }));
  }

  async yearOverYear(user: AuthenticatedUser, termName?: string) {
    const rows = await this.resultRows(user.organizationId);
    const filtered = termName ? rows.filter((row) => row.assessment.term?.name === termName) : rows;
    const groups = new Map<string, number[]>();
    filtered.forEach((row) => {
      const key = `${row.assessment.class?.name}|${row.assessment.class?.section}|${row.assessment.academicYear?.name || 'Unknown'}`;
      const list = groups.get(key) || [];
      list.push(Number(row.percentage));
      groups.set(key, list);
    });
    const classYears = [...groups].map(([key, values]) => {
      const [className, section, academicYear] = key.split('|');
      return { className, section, academicYear, average: values.reduce((a, b) => a + b, 0) / values.length };
    });
    const classes = [...new Set(classYears.map((row) => `${row.className}|${row.section}`))];
    return classes.map((key) => {
      const entries = classYears.filter((row) => `${row.className}|${row.section}` === key).sort((a, b) => a.academicYear.localeCompare(b.academicYear));
      const current = entries.at(-1);
      const previous = entries.at(-2);
      return { ...current, previousAcademicYear: previous?.academicYear || null, previousAverage: previous ? Number(previous.average.toFixed(2)) : null, change: previous ? Number((current!.average - previous.average).toFixed(2)) : null };
    });
  }

  async operationalDashboard(user: AuthenticatedUser) {
    const today = new Date().toISOString().slice(0, 10);
    const attendance = await this.attendance.find({
      where: { organizationId: user.organizationId },
      relations: { session: { class: true } },
    });
    const todaysAttendance = attendance.filter((record) => String(record.session.attendanceDate).slice(0, 10) === today);
    const payments = await this.payments.find({ where: { organizationId: user.organizationId } });
    const todayPayments = payments.filter((payment) => new Date(payment.paymentDate).toISOString().slice(0, 10) === today);
    const now = new Date();
    const monthPayments = payments.filter((payment) => {
      const date = new Date(payment.paymentDate);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const fees = await this.fees.find({ where: { organizationId: user.organizationId } });
    const staff = await this.staffAttendance.find({ where: { organizationId: user.organizationId }, relations: { staff: true } });
    const todaysStaff = staff.filter((record) => new Date(record.attendanceDate).toISOString().slice(0, 10) === today && record.approved);
    const classMetrics = await this.classMetrics(user.organizationId);
    return {
      attendance: {
        presentPercentage: todaysAttendance.length ? Number(((todaysAttendance.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length / todaysAttendance.length) * 100).toFixed(2)) : 0,
        absentCount: todaysAttendance.filter((r) => r.status === 'ABSENT').length,
        byClass: classMetrics.map((row) => ({ classId: row.classId, className: row.className, section: row.section, attendance: row.attendance })),
        links: { absentees: `/attendance/daily?date=${today}`, lowAttendance: '/intelligence/threshold?metric=attendance' },
      },
      fees: {
        collectedToday: todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
        collectedThisMonth: monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
        totalPending: fees.reduce((sum, fee) => sum + Math.max(0, Number(fee.amount) - Number(fee.paidAmount || 0)), 0),
        defaulterCount: fees.filter((fee) => !fee.isPaid && new Date(fee.dueDate) < now).length,
        defaultersUrl: '/fees/reports/defaulters',
      },
      staff: {
        present: todaysStaff.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length,
        absent: todaysStaff.filter((r) => r.status === 'ABSENT').length,
        onLeave: todaysStaff.filter((r) => r.status === 'LEAVE').length,
      },
      weakClasses: [...classMetrics].sort((a, b) => a.passRate - b.passRate).slice(0, 5),
    };
  }

  async generateAlerts(user: AuthenticatedUser) {
    const organization = await this.organizations.findOne({ where: { id: user.organizationId } });
    if (!organization) throw new NotFoundException('Organization not found');
    const metrics = await this.classMetrics(user.organizationId);
    const candidates: Partial<PrincipalAlert>[] = [];
    metrics.forEach((row) => {
      if (row.improvement <= -Number(organization.classPassDropAlertPercent)) candidates.push({
        alertType: 'CLASS_PASS_DROP', title: `Pass rate drop in ${row.className}-${row.section}`,
        message: `Performance dropped ${Math.abs(row.improvement)} points versus the previous assessment.`, detailUrl: `/classes/${row.classId}?view=performance`, fingerprint: `class:${row.classId}:${new Date().toISOString().slice(0, 7)}`,
      });
      if (row.attendance < Number(organization.attendanceAlertPercent)) candidates.push({
        alertType: 'SECTION_ATTENDANCE_LOW', title: `Low attendance in ${row.className}-${row.section}`,
        message: `Attendance is ${row.attendance}%, below the ${organization.attendanceAlertPercent}% threshold.`, detailUrl: `/classes/${row.classId}?view=attendance`, fingerprint: `attendance:${row.classId}:${new Date().toISOString().slice(0, 10)}`,
      });
    });
    const leaderboard = await this.teacherLeaderboard(user);
    leaderboard.filter((row) => row.improvement <= -Number(organization.classPassDropAlertPercent)).forEach((row) => candidates.push({
      alertType: 'TEACHER_AVERAGE_DROP', title: `Sharp result drop for ${row.teacherName}`,
      message: `${row.subjectName} average dropped ${Math.abs(row.improvement)} points.`, detailUrl: `/intelligence/teachers/${row.teacherId}`, fingerprint: `teacher:${row.teacherId}:${row.subjectId}:${new Date().toISOString().slice(0, 7)}`,
    }));
    const fees = await this.fees.find({ where: { organizationId: user.organizationId } });
    const assigned = fees.reduce((sum, fee) => sum + Number(fee.amount), 0);
    const collected = fees.reduce((sum, fee) => sum + Number(fee.paidAmount || 0), 0);
    const feePercent = assigned ? (collected / assigned) * 100 : 100;
    if (feePercent < Number(organization.feeCollectionTargetPercent)) candidates.push({
      alertType: 'FEE_COLLECTION_LOW', title: 'Fee collection below target',
      message: `Collection is ${feePercent.toFixed(2)}%, below the ${organization.feeCollectionTargetPercent}% target.`, detailUrl: '/fees/reports/collections', fingerprint: `fees:${new Date().toISOString().slice(0, 7)}`,
    });
    let created = 0;
    for (const candidate of candidates) {
      const exists = await this.alerts.findOne({ where: { organizationId: user.organizationId, fingerprint: candidate.fingerprint! } });
      if (!exists) {
        await this.alerts.save(this.alerts.create({ ...candidate, organizationId: user.organizationId, acknowledged: false, acknowledgedBy: null }));
        created++;
      }
    }
    return { evaluated: candidates.length, created };
  }

  listAlerts(user: AuthenticatedUser) {
    return this.alerts.find({ where: { organizationId: user.organizationId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async acknowledgeAlert(id: string, user: AuthenticatedUser) {
    const alert = await this.alerts.findOne({ where: { id, organizationId: user.organizationId } });
    if (!alert) throw new NotFoundException('Alert not found');
    alert.acknowledged = true;
    alert.acknowledgedBy = { id: user.id } as User;
    return this.alerts.save(alert);
  }

  private async classMetrics(organizationId: string) {
    const classes = await this.classes.find({ where: { organizationId, isActive: true } });
    const results = await this.resultRows(organizationId);
    const attendance = await this.attendance.find({ where: { organizationId }, relations: { session: { class: true } } });
    const fees = await this.fees.find({ where: { organizationId }, relations: { student: true } });
    return classes.map((cls) => {
      const classResults = results.filter((result) => result.assessment.class?.id === cls.id);
      const series = this.assessmentSeries(classResults);
      const latestAssessmentId = series.at(-1)?.assessmentId;
      const current = latestAssessmentId ? classResults.filter((result) => result.assessment.id === latestAssessmentId) : [];
      const classAttendance = attendance.filter((record) => record.session.class.id === cls.id);
      const classFees = fees.filter((fee) => fee.student.className === cls.name && fee.student.section === cls.section);
      const assigned = classFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
      return {
        classId: cls.id,
        className: cls.name,
        section: cls.section,
        averageScore: current.length ? Number((current.reduce((sum, result) => sum + Number(result.percentage), 0) / current.length).toFixed(2)) : 0,
        passRate: current.length ? Number(((current.filter((result) => result.isPassed).length / current.length) * 100).toFixed(2)) : 0,
        attendance: classAttendance.length ? Number(((classAttendance.filter((record) => record.status === 'PRESENT' || record.status === 'LATE').length / classAttendance.length) * 100).toFixed(2)) : 0,
        feeCollection: assigned ? Number(((classFees.reduce((sum, fee) => sum + Number(fee.paidAmount || 0), 0) / assigned) * 100).toFixed(2)) : 0,
        improvement: series.length > 1 ? Number((series.at(-1)!.average - series.at(-2)!.average).toFixed(2)) : 0,
      };
    });
  }

  private resultRows(organizationId: string) {
    return this.results.find({
      where: { organizationId },
      relations: { student: true, subject: true, assessment: { class: true, term: true, academicYear: true } },
      order: { createdAt: 'ASC' },
    });
  }

  private assessmentSeries(results: Result[]) {
    const groups = new Map<string, Result[]>();
    results.forEach((result) => { const list = groups.get(result.assessment.id) || []; list.push(result); groups.set(result.assessment.id, list); });
    return [...groups].map(([assessmentId, rows]) => ({
      assessmentId,
      date: new Date(rows[0].assessment.examDate || rows[0].createdAt).getTime(),
      average: Number((rows.reduce((sum, result) => sum + Number(result.percentage), 0) / rows.length).toFixed(2)),
    })).sort((a, b) => a.date - b.date);
  }

  private async cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    const value = await loader();
    this.cache.set(key, { expires: Date.now() + 60_000, value });
    return value;
  }
}
