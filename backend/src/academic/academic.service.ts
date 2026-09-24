import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { AcademicYear } from './academic-year.entity';
import { StudentEnrollment } from './student-enrollment.entity';
import { TeacherAssignment } from './teacher-assignment.entity';
import { Term } from './term.entity';

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(AcademicYear)
    private readonly academicYears: Repository<AcademicYear>,
    @InjectRepository(Term)
    private readonly terms: Repository<Term>,
    @InjectRepository(StudentEnrollment)
    private readonly enrollments: Repository<StudentEnrollment>,
    @InjectRepository(TeacherAssignment)
    private readonly teacherAssignments: Repository<TeacherAssignment>,
  ) {}

  findAcademicYears(user: AuthenticatedUser) {
    return this.academicYears.find({ where: { organizationId: user.organizationId } });
  }

  async createAcademicYear(payload: Partial<AcademicYear>, user: AuthenticatedUser) {
    if (payload.isCurrent) {
      await this.academicYears.update(
        { organizationId: user.organizationId, isCurrent: true },
        { isCurrent: false },
      );
    }

    return this.academicYears.save(
      this.academicYears.create({ ...payload, organizationId: user.organizationId }),
    );
  }

  findTerms(user: AuthenticatedUser) {
    return this.terms.find({
      where: { organizationId: user.organizationId },
      relations: { academicYear: true },
    });
  }

  createTerm(payload: Partial<Term> & { academicYearId?: string }, user: AuthenticatedUser) {
    return this.terms.save(
      this.terms.create({
        ...payload,
        organizationId: user.organizationId,
        academicYear: payload.academicYearId ? ({ id: payload.academicYearId } as AcademicYear) : undefined,
      }),
    );
  }

  findEnrollments(user: AuthenticatedUser) {
    return this.enrollments.find({
      where: { organizationId: user.organizationId },
      relations: { student: true, class: true },
    });
  }

  async createEnrollment(
    payload: Partial<StudentEnrollment> & { studentId: string; classId: string },
    user: AuthenticatedUser,
  ) {
    if (!payload.studentId || !payload.classId) {
      throw new BadRequestException('studentId and classId are required');
    }

    if (payload.isCurrent !== false) {
      await this.enrollments.update(
        {
          organizationId: user.organizationId,
          student: { id: payload.studentId },
          isCurrent: true,
        },
        { isCurrent: false },
      );
    }

    return this.enrollments.save(
      this.enrollments.create({
        academicYear: payload.academicYear,
        term: payload.term,
        isCurrent: payload.isCurrent ?? true,
        organizationId: user.organizationId,
        student: { id: payload.studentId },
        class: { id: payload.classId },
      }),
    );
  }

  findTeacherAssignments(user: AuthenticatedUser) {
    return this.teacherAssignments.find({
      where: { organizationId: user.organizationId },
      relations: { teacher: true, class: true, subject: true },
    });
  }

  createTeacherAssignment(
    payload: Partial<TeacherAssignment> & { teacherId: string; classId: string; subjectId: string },
    user: AuthenticatedUser,
  ) {
    if (!payload.teacherId || !payload.classId || !payload.subjectId) {
      throw new BadRequestException('teacherId, classId and subjectId are required');
    }

    return this.teacherAssignments.save(
      this.teacherAssignments.create({
        isClassIncharge: payload.isClassIncharge ?? false,
        organizationId: user.organizationId,
        teacher: { id: payload.teacherId },
        class: { id: payload.classId },
        subject: { id: payload.subjectId },
      }),
    );
  }
}
