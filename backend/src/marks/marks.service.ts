import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { Assessment } from '../exams/assessment.entity';
import { ResultsService } from '../results/results.service';
import { Student } from '../students/student.entity';
import { Subject } from '../subjects/subject.entity';
import { Teacher } from '../teachers/teacher.entity';
import { Mark } from './mark.entity';
import { MarkPayload } from './mark-payload.interface';
import { parseMarksFile } from './marks-file.parser';
import { MarksCorrectionRequest } from './marks-correction-request.entity';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MarksService {
  constructor(
    @InjectRepository(Mark)
    private readonly marks: Repository<Mark>,
    @InjectRepository(Assessment)
    private readonly assessments: Repository<Assessment>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @InjectRepository(Teacher)
    private readonly teachers: Repository<Teacher>,
    @InjectRepository(TeacherAssignment)
    private readonly assignments: Repository<TeacherAssignment>,
    @InjectRepository(MarksCorrectionRequest)
    private readonly corrections: Repository<MarksCorrectionRequest>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly results: ResultsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  findByAssessment(assessmentId: string, user: AuthenticatedUser) {
    return this.marks.find({
      where: { assessment: { id: assessmentId }, organizationId: user.organizationId },
      relations: { student: true, subject: true, assessment: true },
    });
  }

  async enterMark(payload: MarkPayload, user: AuthenticatedUser) {
    await this.validateMarkPayload(payload, user);

    const existing = await this.marks.findOne({
      where: {
        organizationId: user.organizationId,
        assessment: { id: payload.assessmentId },
        student: { id: payload.studentId },
        subject: { id: payload.subjectId },
      },
      relations: { assessment: true },
    });

    if (existing) {
      existing.obtainedMarks = payload.isAbsent ? 0 : payload.obtainedMarks;
      existing.isAbsent = payload.isAbsent ?? false;
      return this.marks.save(existing);
    }

    return this.marks.save(
      this.marks.create({
        organizationId: user.organizationId,
        assessment: { id: payload.assessmentId },
        student: { id: payload.studentId },
        subject: { id: payload.subjectId },
        obtainedMarks: payload.isAbsent ? 0 : payload.obtainedMarks,
        isAbsent: payload.isAbsent ?? false,
      }),
    );
  }

  async importMarks(rows: MarkPayload[], user: AuthenticatedUser) {
    if (!rows.length) {
      throw new BadRequestException('At least one mark row is required');
    }

    // Pre-flight validate entire batch before opening transaction
    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const key = `${row.assessmentId}:${row.studentId}:${row.subjectId}`;
      if (seen.has(key)) {
        throw new BadRequestException(`Row ${i + 1}: Duplicate mark entry for student/assessment/subject: ${key}`);
      }
      seen.add(key);
      await this.validateMarkPayload(row, user);
    }

    // Atomic execution: any failure aborts transaction and rolls back
    return this.dataSource.transaction(async (manager) => {
      const marksRepo = manager.getRepository(Mark);
      const saved: Mark[] = [];

      for (const row of rows) {
        const existing = await marksRepo.findOne({
          where: {
            organizationId: user.organizationId,
            assessment: { id: row.assessmentId },
            student: { id: row.studentId },
            subject: { id: row.subjectId },
          },
        });

        if (existing) {
          existing.obtainedMarks = row.isAbsent ? 0 : row.obtainedMarks;
          existing.isAbsent = row.isAbsent ?? false;
          saved.push(await marksRepo.save(existing));
        } else {
          const entity = marksRepo.create({
            organizationId: user.organizationId,
            assessment: { id: row.assessmentId },
            student: { id: row.studentId },
            subject: { id: row.subjectId },
            obtainedMarks: row.isAbsent ? 0 : row.obtainedMarks,
            isAbsent: row.isAbsent ?? false,
          });
          saved.push(await marksRepo.save(entity));
        }
      }

      return {
        success: true,
        importedCount: saved.length,
        message: `Atomically imported ${saved.length} marks rows without errors.`,
        records: saved,
      };
    });
  }

  async importFile(file: { buffer: Buffer; originalname: string }, user: AuthenticatedUser) {
    const rows = parseMarksFile(file.buffer, file.originalname);
    return this.importMarks(rows, user);
  }

  getTemplateCsv(): string {
    return (
      'assessmentId,studentId,subjectId,obtainedMarks,isAbsent\r\n' +
      'replace-with-assessment-uuid,replace-with-student-uuid,replace-with-subject-uuid,85,false\r\n' +
      'replace-with-assessment-uuid,replace-with-second-student-uuid,replace-with-subject-uuid,0,true\r\n'
    );
  }

  async publishAssessment(assessmentId: string, user: AuthenticatedUser) {
    const assessment = await this.assessments.findOne({
      where: { id: assessmentId, organizationId: user.organizationId },
      relations: { subject: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    assessment.status = 'Published';
    assessment.isPublished = true;
    await this.assessments.save(assessment);
    const results = await this.results.calculateForAssessment(assessmentId, user.organizationId);

    const studentIds = [...new Set(results.map((result) => result.student?.id).filter(Boolean))];
    await Promise.all(studentIds.map((studentId) => this.notifications.notifyStudent(
      user.organizationId,
      studentId,
      'RESULT_PUBLISHED',
      { assessment: assessment.name },
    )));

    await this.audit.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'PUBLISH_RESULT',
      resource: 'results',
      newValue: { assessmentId, resultCount: results.length },
    });

    return { assessment, results };
  }

  async requestCorrection(
    markId: string,
    payload: { requestedValue: number; reason: string },
    user: AuthenticatedUser,
  ) {
    const mark = await this.marks.findOne({
      where: { id: markId, organizationId: user.organizationId },
      relations: { assessment: { class: true }, subject: true, student: true },
    });
    if (!mark) throw new NotFoundException('Mark not found');
    if (!mark.assessment.isPublished) throw new BadRequestException('Use normal marks entry before publishing');
    if (!payload.reason?.trim()) throw new BadRequestException('A correction reason is required');
    if (Number(payload.requestedValue) < 0 || Number(payload.requestedValue) > Number(mark.assessment.maximumMarks)) {
      throw new BadRequestException('Requested marks are outside the assessment range');
    }
    if (user.role === 'TEACHER') {
      const teacher = await this.teachers.findOne({ where: { organizationId: user.organizationId, user: { id: user.id } } });
      const assignment = teacher && await this.assignments.findOne({
        where: {
          organizationId: user.organizationId,
          teacher: { id: teacher.id },
          class: { id: mark.assessment.class?.id },
          subject: { id: mark.subject.id },
        },
      });
      if (!assignment) throw new ForbiddenException('You are not assigned to this class and subject');
    }
    const request = await this.corrections.save(this.corrections.create({
      organizationId: user.organizationId,
      mark,
      oldValue: Number(mark.obtainedMarks),
      requestedValue: Number(payload.requestedValue),
      reason: payload.reason.trim(),
      requestedBy: { id: user.id } as User,
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
    }));
    await this.audit.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REQUEST_MARKS_CORRECTION',
      resource: 'marks',
      oldValue: { markId, value: mark.obtainedMarks },
      newValue: { requestedValue: payload.requestedValue, reason: payload.reason },
    });
    return request;
  }

  listCorrections(user: AuthenticatedUser, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.corrections.find({
      where: { organizationId: user.organizationId, ...(status ? { status } : {}) },
      relations: { mark: { student: true, subject: true, assessment: true }, requestedBy: true, reviewedBy: true },
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
      relations: { mark: { assessment: true } },
    });
    if (!request) throw new NotFoundException('Marks correction request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request has already been reviewed');
    if (!['APPROVED', 'REJECTED'].includes(payload.status)) throw new BadRequestException('Invalid review status');
    request.status = payload.status;
    request.reviewedBy = { id: user.id } as User;
    request.reviewedAt = new Date();
    request.reviewReason = payload.reason || null;
    if (payload.status === 'APPROVED') {
      request.mark.obtainedMarks = Number(request.requestedValue);
      request.mark.isAbsent = false;
      await this.marks.save(request.mark);
      await this.results.calculateForAssessment(request.mark.assessment.id, user.organizationId);
    }
    await this.corrections.save(request);
    await this.audit.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: `MARKS_CORRECTION_${payload.status}`,
      resource: 'marks',
      oldValue: { markId: request.mark.id, value: Number(request.oldValue) },
      newValue: { value: payload.status === 'APPROVED' ? Number(request.requestedValue) : Number(request.oldValue), reason: payload.reason },
    });
    return request;
  }

  private async validateMarkPayload(payload: MarkPayload, user: AuthenticatedUser): Promise<void> {
    const assessment = await this.assessments.findOne({
      where: { id: payload.assessmentId, organizationId: user.organizationId },
      relations: { class: true, subject: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.isPublished) {
      throw new BadRequestException('Published marks are immutable');
    }

    if (!payload.isAbsent && Number(payload.obtainedMarks) > Number(assessment.maximumMarks)) {
      throw new BadRequestException('Marks cannot exceed maximum marks');
    }

    const [student, subject] = await Promise.all([
      this.students.findOne({ where: { id: payload.studentId, organizationId: user.organizationId } }),
      this.subjects.findOne({ where: { id: payload.subjectId, organizationId: user.organizationId } }),
    ]);

    if (!student) {
      throw new BadRequestException('Invalid student');
    }

    if (!subject) {
      throw new BadRequestException('Invalid subject');
    }

    if (assessment.subject?.id && assessment.subject.id !== payload.subjectId) {
      throw new BadRequestException('Incorrect subject for assessment');
    }

    if (user.role === 'TEACHER') {
      const teacher = await this.teachers.findOne({
        where: { organizationId: user.organizationId, user: { id: user.id } },
      });

      if (!teacher) {
        throw new ForbiddenException('Teacher profile is not linked to this user');
      }

      const assignment = await this.assignments.findOne({
        where: {
          organizationId: user.organizationId,
          teacher: { id: teacher.id },
          class: { id: assessment.class?.id },
          subject: { id: payload.subjectId },
        },
      });

      if (!assignment) {
        throw new ForbiddenException('Teacher is not assigned to this class and subject');
      }
    }
  }
}
