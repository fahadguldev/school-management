import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { AuditService } from '../audit/audit.service';
import { Class } from '../classes/class.entity';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { NotificationsService } from '../notifications/notifications.service';
import { Organization } from '../organizations/organization.entity';
import { Student } from '../students/student.entity';
import { Teacher } from '../teachers/teacher.entity';
import { User } from '../users/user.entity';
import { AttendanceCorrectionRequest } from './attendance-correction-request.entity';
import { AttendanceRecord, AttendanceStatus } from './attendance-record.entity';
import { AttendanceSession } from './attendance-session.entity';
import { StaffAttendanceRecord } from './staff-attendance-record.entity';
import { StaffLeaveRequest } from './staff-leave-request.entity';

const VALID_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'];

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceSession) private readonly sessions: Repository<AttendanceSession>,
    @InjectRepository(AttendanceRecord) private readonly records: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceCorrectionRequest) private readonly corrections: Repository<AttendanceCorrectionRequest>,
    @InjectRepository(StaffAttendanceRecord) private readonly staffRecords: Repository<StaffAttendanceRecord>,
    @InjectRepository(StaffLeaveRequest) private readonly leaveRequests: Repository<StaffLeaveRequest>,
    @InjectRepository(StudentEnrollment) private readonly enrollments: Repository<StudentEnrollment>,
    @InjectRepository(TeacherAssignment) private readonly assignments: Repository<TeacherAssignment>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Class) private readonly classes: Repository<Class>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async createSession(
    payload: { classId: string; date?: string; period?: string },
    user: AuthenticatedUser,
  ) {
    const cls = await this.classes.findOne({ where: { id: payload.classId, organizationId: user.organizationId } });
    if (!cls) throw new NotFoundException('Class not found');
    await this.assertCanMarkClass(cls.id, user);
    const organization = await this.organizations.findOne({ where: { id: user.organizationId } });
    if (organization?.attendanceGranularity === 'period' && !payload.period) {
      throw new BadRequestException('period is required for per-period attendance');
    }
    const attendanceDate = this.dateOnly(payload.date);
    let session = await this.sessions.findOne({
      where: {
        organizationId: user.organizationId,
        class: { id: cls.id },
        attendanceDate,
        period: payload.period || undefined,
      },
      relations: { class: true, records: { student: true } },
    });
    if (session) return this.sessionView(session, organization?.attendanceLockDays ?? 2);

    const enrollments = await this.enrollments.find({
      where: { organizationId: user.organizationId, class: { id: cls.id }, isCurrent: true },
      relations: { student: true },
    });
    session = await this.sessions.save(this.sessions.create({
      organizationId: user.organizationId,
      class: cls,
      attendanceDate,
      period: payload.period || null,
      locked: false,
      createdBy: { id: user.id } as User,
    }));
    if (enrollments.length) {
      await this.records.save(enrollments.map((enrollment) => this.records.create({
        organizationId: user.organizationId,
        session,
        student: enrollment.student,
        status: 'PRESENT',
        markedBy: { id: user.id } as User,
        markedAt: new Date(),
      })));
    }
    const loaded = await this.getSessionEntity(session.id, user.organizationId);
    await this.audit.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE_ATTENDANCE_SESSION',
      resource: 'attendance',
      newValue: { sessionId: session.id, classId: cls.id, attendanceDate, defaultStatus: 'PRESENT' },
    });
    return this.sessionView(loaded, organization?.attendanceLockDays ?? 2);
  }

  async getSession(id: string, user: AuthenticatedUser) {
    const session = await this.getSessionEntity(id, user.organizationId);
    const organization = await this.organizations.findOne({ where: { id: user.organizationId } });
    return this.sessionView(session, organization?.attendanceLockDays ?? 2);
  }

  async dailyClassView(date: string | undefined, classId: string | undefined, user: AuthenticatedUser) {
    const where: any = { organizationId: user.organizationId, attendanceDate: this.dateOnly(date) };
    if (classId) where.class = { id: classId };
    const sessions = await this.sessions.find({
      where,
      relations: { class: true, records: { student: true } },
      order: { createdAt: 'ASC' },
    });
    return sessions.map((session) => ({
      sessionId: session.id,
      class: { id: session.class.id, name: session.class.name, section: session.class.section },
      date: session.attendanceDate,
      period: session.period,
      counts: this.countStatuses(session.records),
      exceptions: session.records
        .filter((record) => record.status !== 'PRESENT')
        .map((record) => ({ recordId: record.id, student: record.student, status: record.status })),
    }));
  }

  async mark(
    sessionId: string,
    payload: { updates?: { studentId: string; status: AttendanceStatus }[]; studentIds?: string[]; status?: AttendanceStatus; wholeClass?: boolean },
    user: AuthenticatedUser,
  ) {
    const session = await this.getSessionEntity(sessionId, user.organizationId);
    await this.assertCanMarkClass(session.class.id, user);
    const organization = await this.organizations.findOne({ where: { id: user.organizationId } });
    if (this.isLocked(session, organization?.attendanceLockDays ?? 2)) {
      throw new ForbiddenException('Attendance is locked; submit a correction request');
    }
    const updates = payload.wholeClass
      ? session.records.map((record) => ({ studentId: record.student.id, status: payload.status || 'ABSENT' as AttendanceStatus }))
      : payload.updates || (payload.studentIds || []).map((studentId) => ({ studentId, status: payload.status! }));
    if (!updates.length) throw new BadRequestException('At least one attendance update is required');
    const recordMap = new Map(session.records.map((record) => [record.student.id, record]));
    const changed: AttendanceRecord[] = [];
    for (const update of updates) {
      if (!VALID_STATUSES.includes(update.status)) throw new BadRequestException(`Invalid status ${update.status}`);
      const record = recordMap.get(update.studentId);
      if (!record) throw new BadRequestException(`Student ${update.studentId} is not in this session`);
      if (record.status === update.status) continue;
      const oldStatus = record.status;
      record.status = update.status;
      record.markedAt = new Date();
      record.markedBy = { id: user.id } as User;
      changed.push(record);
      await this.audit.recordLog({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'MARK_STUDENT_ATTENDANCE',
        resource: 'attendance',
        oldValue: { recordId: record.id, status: oldStatus },
        newValue: { recordId: record.id, status: update.status },
      });
      if (update.status === 'ABSENT') {
        void this.notifications.notifyStudent(user.organizationId, record.student.id, 'STUDENT_ABSENT', {
          date: String(session.attendanceDate),
        });
      }
    }
    if (changed.length) await this.records.save(changed);
    return this.getSession(sessionId, user);
  }

  async studentHistory(studentId: string, user: AuthenticatedUser, from?: string, to?: string) {
    const student = await this.students.findOne({ where: { id: studentId, organizationId: user.organizationId } });
    if (!student) throw new NotFoundException('Student not found');
    const records = await this.records.find({
      where: {
        organizationId: user.organizationId,
        student: { id: studentId },
        ...(from && to ? { session: { attendanceDate: Between(this.dateOnly(from), this.dateOnly(to)) } } : {}),
      },
      relations: { session: { class: true } },
      order: { markedAt: 'DESC' },
    });
    const counts = this.countStatuses(records);
    return {
      student: { id: student.id, name: student.name, admissionNumber: student.admissionNumber },
      summary: {
        totalDays: records.length,
        ...counts,
        absencePercentage: records.length ? Number(((counts.absent / records.length) * 100).toFixed(2)) : 0,
      },
      records: records.map((record) => ({
        recordId: record.id,
        date: record.session.attendanceDate,
        period: record.session.period,
        className: record.session.class.name,
        section: record.session.class.section,
        status: record.status,
      })),
    };
  }

  async requestCorrection(
    recordId: string,
    payload: { requestedStatus: AttendanceStatus; reason: string },
    user: AuthenticatedUser,
  ) {
    if (!VALID_STATUSES.includes(payload.requestedStatus) || !payload.reason?.trim()) {
      throw new BadRequestException('requestedStatus and reason are required');
    }
    const record = await this.records.findOne({
      where: { id: recordId, organizationId: user.organizationId },
      relations: { session: { class: true } },
    });
    if (!record) throw new NotFoundException('Attendance record not found');
    await this.assertCanMarkClass(record.session.class.id, user);
    return this.corrections.save(this.corrections.create({
      organizationId: user.organizationId,
      record,
      oldStatus: record.status,
      requestedStatus: payload.requestedStatus,
      reason: payload.reason.trim(),
      requestedBy: { id: user.id } as User,
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
    }));
  }

  listCorrections(user: AuthenticatedUser, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.corrections.find({
      where: { organizationId: user.organizationId, ...(status ? { status } : {}) },
      relations: { record: { student: true, session: { class: true } }, requestedBy: true, reviewedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async reviewCorrection(
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; reason?: string },
    user: AuthenticatedUser,
  ) {
    const request = await this.corrections.findOne({
      where: { id, organizationId: user.organizationId },
      relations: { record: true },
    });
    if (!request) throw new NotFoundException('Correction request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Correction request has already been reviewed');
    if (!['APPROVED', 'REJECTED'].includes(payload.status)) throw new BadRequestException('Invalid review status');
    request.status = payload.status;
    request.reviewedBy = { id: user.id } as User;
    request.reviewedAt = new Date();
    request.reviewReason = payload.reason || null;
    if (payload.status === 'APPROVED') {
      request.record.status = request.requestedStatus;
      request.record.markedAt = new Date();
      request.record.markedBy = { id: user.id } as User;
      await this.records.save(request.record);
    }
    await this.corrections.save(request);
    await this.audit.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: `ATTENDANCE_CORRECTION_${payload.status}`,
      resource: 'attendance',
      oldValue: { recordId: request.record.id, status: request.oldStatus },
      newValue: { status: payload.status === 'APPROVED' ? request.requestedStatus : request.oldStatus, reason: payload.reason },
    });
    return request;
  }

  async markStaff(
    payload: { staffId: string; date?: string; status: AttendanceStatus },
    user: AuthenticatedUser,
  ) {
    if (!VALID_STATUSES.includes(payload.status)) throw new BadRequestException('Invalid attendance status');
    const organization = await this.organizations.findOne({ where: { id: user.organizationId } });
    const selfMark = payload.staffId === user.id;
    if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL' && !selfMark) {
      throw new ForbiddenException('Staff can only self-mark attendance');
    }
    if (selfMark && organization?.staffAttendanceMode !== 'self_with_approval' && !['ADMIN', 'PRINCIPAL'].includes(user.role)) {
      throw new ForbiddenException('Self-marking is disabled');
    }
    const staff = await this.users.findOne({ where: { id: payload.staffId, organizationId: user.organizationId } });
    if (!staff || staff.role === 'STUDENT') throw new NotFoundException('Staff member not found');
    let record = await this.staffRecords.findOne({
      where: { organizationId: user.organizationId, staff: { id: staff.id }, attendanceDate: this.dateOnly(payload.date) },
    });
    record = this.staffRecords.create({
      ...(record || {}),
      organizationId: user.organizationId,
      staff,
      attendanceDate: this.dateOnly(payload.date),
      status: payload.status,
      markedBy: { id: user.id } as User,
      approved: !selfMark || ['ADMIN', 'PRINCIPAL'].includes(user.role),
    });
    const saved = await this.staffRecords.save(record);
    await this.audit.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'MARK_STAFF_ATTENDANCE',
      resource: 'staff_attendance',
      newValue: { staffId: staff.id, date: payload.date, status: payload.status, approved: saved.approved },
    });
    return saved;
  }

  staffSummary(user: AuthenticatedUser, month?: string) {
    const base = month && /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T00:00:00`) : new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return this.staffRecords.find({
      where: { organizationId: user.organizationId, attendanceDate: Between(start, end), approved: true },
      relations: { staff: true },
      order: { attendanceDate: 'DESC' },
    }).then((records) => {
      const grouped = new Map<string, { staff: User; records: StaffAttendanceRecord[] }>();
      records.forEach((record) => {
        const current = grouped.get(record.staff.id) || { staff: record.staff, records: [] };
        current.records.push(record);
        grouped.set(record.staff.id, current);
      });
      return [...grouped.values()].map(({ staff, records: entries }) => ({
        staff: { id: staff.id, name: `${staff.firstName} ${staff.lastName}`.trim(), role: staff.role },
        totalDays: entries.length,
        ...this.countStatuses(entries),
      }));
    });
  }

  requestLeave(payload: { startDate: string; endDate: string; reason: string }, user: AuthenticatedUser) {
    if (!payload.reason?.trim() || new Date(payload.endDate) < new Date(payload.startDate)) {
      throw new BadRequestException('Valid leave dates and reason are required');
    }
    return this.leaveRequests.save(this.leaveRequests.create({
      organizationId: user.organizationId,
      staff: { id: user.id } as User,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      reason: payload.reason.trim(),
      status: 'PENDING',
      approvedBy: null,
    }));
  }

  listLeaveRequests(user: AuthenticatedUser) {
    const where: any = { organizationId: user.organizationId };
    if (!['ADMIN', 'PRINCIPAL'].includes(user.role)) where.staff = { id: user.id };
    return this.leaveRequests.find({ where, relations: { staff: true, approvedBy: true }, order: { createdAt: 'DESC' } });
  }

  async reviewLeave(id: string, status: 'APPROVED' | 'REJECTED', user: AuthenticatedUser) {
    const request = await this.leaveRequests.findOne({
      where: { id, organizationId: user.organizationId },
      relations: { staff: true },
    });
    if (!request) throw new NotFoundException('Leave request not found');
    if (!['APPROVED', 'REJECTED'].includes(status)) throw new BadRequestException('Invalid review status');
    request.status = status;
    request.approvedBy = { id: user.id } as User;
    return this.leaveRequests.save(request);
  }

  private async getSessionEntity(id: string, organizationId: string) {
    const session = await this.sessions.findOne({
      where: { id, organizationId },
      relations: { class: true, records: { student: true, markedBy: true } },
    });
    if (!session) throw new NotFoundException('Attendance session not found');
    return session;
  }

  private async assertCanMarkClass(classId: string, user: AuthenticatedUser) {
    if (user.role === 'ADMIN') return;
    if (!['TEACHER', 'INCHARGE'].includes(user.role)) throw new ForbiddenException('Role cannot mark student attendance');
    const teacher = await this.teachers.findOne({ where: { organizationId: user.organizationId, user: { id: user.id } } });
    if (!teacher) throw new ForbiddenException('Teacher profile is not linked');
    const assignment = await this.assignments.findOne({
      where: {
        organizationId: user.organizationId,
        teacher: { id: teacher.id },
        class: { id: classId },
        ...(user.role === 'INCHARGE' ? { isClassIncharge: true } : {}),
      },
    });
    if (!assignment) throw new ForbiddenException('You are not assigned to this class');
  }

  private sessionView(session: AttendanceSession, lockDays: number) {
    const locked = this.isLocked(session, lockDays);
    if (session.locked !== locked) void this.sessions.update(session.id, { locked });
    return {
      id: session.id,
      class: session.class,
      date: session.attendanceDate,
      period: session.period,
      locked,
      counts: this.countStatuses(session.records || []),
      records: (session.records || []).map((record) => ({
        id: record.id,
        student: record.student,
        status: record.status,
        markedAt: record.markedAt,
      })),
    };
  }

  private isLocked(session: AttendanceSession, lockDays: number) {
    if (session.locked) return true;
    const cutoff = new Date(session.attendanceDate);
    cutoff.setDate(cutoff.getDate() + lockDays);
    cutoff.setHours(23, 59, 59, 999);
    return new Date() > cutoff;
  }

  private countStatuses(records: { status: AttendanceStatus }[]) {
    return {
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      leave: records.filter((r) => r.status === 'LEAVE').length,
    };
  }

  private dateOnly(value?: string): Date {
    const date = value ? new Date(`${value}T00:00:00`) : new Date();
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
