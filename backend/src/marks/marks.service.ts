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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly results: ResultsService,
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
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    assessment.status = 'Published';
    assessment.isPublished = true;
    await this.assessments.save(assessment);
    const results = await this.results.calculateForAssessment(assessmentId, user.organizationId);

    return { assessment, results };
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
