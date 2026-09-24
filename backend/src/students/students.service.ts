import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { TenantCrudService } from '../common/crud/tenant-crud.service';
import { Result } from '../results/result.entity';
import { Teacher } from '../teachers/teacher.entity';
import { Student } from './student.entity';

@Injectable()
export class StudentsService extends TenantCrudService<Student> {
  constructor(
    @InjectRepository(Student) repo: Repository<Student>,
    @InjectRepository(StudentEnrollment)
    private readonly enrollments: Repository<StudentEnrollment>,
    @InjectRepository(TeacherAssignment)
    private readonly assignments: Repository<TeacherAssignment>,
    @InjectRepository(Teacher)
    private readonly teachers: Repository<Teacher>,
    @InjectRepository(Result)
    private readonly results: Repository<Result>,
  ) {
    super(repo);
  }

  async findAll(
    user: AuthenticatedUser,
    filters?: {
      classId?: string;
      section?: string;
      isActive?: string | boolean;
      search?: string;
    },
  ): Promise<Student[]> {
    const activeFilter =
      filters?.isActive === 'all'
        ? undefined
        : filters?.isActive !== undefined
          ? filters.isActive === true || filters.isActive === 'true'
          : true;

    // Teachers see only students in their assigned classes.
    // Incharges see only students in their incharge class.
    if (user.role === 'TEACHER' || user.role === 'INCHARGE') {
      const teacher = await this.teachers.findOne({
        where: { organizationId: user.organizationId, user: { id: user.id } },
      });

      if (!teacher) {
        return [];
      }

      const classIds: string[] = [];

      if (user.role === 'TEACHER') {
        const teacherAssignments = await this.assignments.find({
          where: {
            organizationId: user.organizationId,
            teacher: { id: teacher.id },
          },
          relations: { class: true },
        });
        classIds.push(...teacherAssignments.map((a) => a.class?.id).filter(Boolean) as string[]);
      } else {
        const inchargeAssignment = await this.assignments.find({
          where: {
            organizationId: user.organizationId,
            teacher: { id: teacher.id },
            isClassIncharge: true,
          },
          relations: { class: true },
        });
        classIds.push(...inchargeAssignment.map((a) => a.class?.id).filter(Boolean) as string[]);
      }

      if (!classIds.length) {
        return [];
      }

      const targetClassIds = filters?.classId ? classIds.filter((id) => id === filters.classId) : classIds;

      if (!targetClassIds.length) {
        return [];
      }

      const enrollments = await this.enrollments.find({
        where: {
          organizationId: user.organizationId,
          isCurrent: true,
          class: { id: In(targetClassIds) },
        },
        relations: { student: true, class: true },
      });

      let studentList = enrollments
        .map((enrollment) => enrollment.student)
        .filter((s): s is Student => Boolean(s) && (activeFilter === undefined || s.isActive === activeFilter));

      if (filters?.section) {
        studentList = studentList.filter((s) => s.section?.toLowerCase() === filters.section?.toLowerCase());
      }

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        studentList = studentList.filter(
          (s) => s.name?.toLowerCase().includes(q) || s.admissionNumber?.toLowerCase().includes(q),
        );
      }

      return studentList;
    }

    // Admins and Principals: School-wide with optional class / section / status / search filters
    if (filters?.classId || filters?.section) {
      const enrollments = await this.enrollments.find({
        where: {
          organizationId: user.organizationId,
          isCurrent: true,
          class: {
            ...(filters?.classId ? { id: filters.classId } : {}),
            ...(filters?.section ? { section: filters.section } : {}),
          },
        },
        relations: { student: true, class: true },
      });

      let studentList = enrollments
        .map((enrollment) => enrollment.student)
        .filter((s): s is Student => Boolean(s) && (activeFilter === undefined || s.isActive === activeFilter));

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        studentList = studentList.filter(
          (s) => s.name?.toLowerCase().includes(q) || s.admissionNumber?.toLowerCase().includes(q),
        );
      }

      return studentList;
    }

    const where: any = { organizationId: user.organizationId };
    if (activeFilter !== undefined) {
      where.isActive = activeFilter;
    }

    let allStudents = await this.repo.find({ where, order: { name: 'ASC' } });

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      allStudents = allStudents.filter(
        (s) => s.name?.toLowerCase().includes(q) || s.admissionNumber?.toLowerCase().includes(q),
      );
    }

    return allStudents;
  }

  async create(payload: Partial<Student>, user: AuthenticatedUser): Promise<Student> {
    const admissionNumber =
      payload.admissionNumber || `ADM-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    const contactInformation =
      payload.contactInformation || `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@school.local`;
    const dateOfBirth = payload.dateOfBirth ? new Date(payload.dateOfBirth) : new Date('2010-01-01');
    const admissionDate = payload.admissionDate ? new Date(payload.admissionDate) : new Date();

    const entity = this.repo.create({
      ...payload,
      organizationId: user.organizationId,
      admissionNumber,
      contactInformation,
      gender: payload.gender || 'Not Specified',
      dateOfBirth,
      admissionDate,
      status: payload.status !== undefined ? payload.status : true,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
    });

    return this.repo.save(entity);
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Student> {
    const student = await this.repo.findOne({
      where: { id, organizationId: user.organizationId },
      relations: { enrollments: { class: true } },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async deactivate(id: string, user: AuthenticatedUser): Promise<Student> {
    const student = await this.repo.findOne({
      where: { id, organizationId: user.organizationId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    student.isActive = false;
    student.status = false;
    return this.repo.save(student);
  }

  async activate(id: string, user: AuthenticatedUser): Promise<Student> {
    const student = await this.repo.findOne({
      where: { id, organizationId: user.organizationId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    student.isActive = true;
    student.status = true;
    return this.repo.save(student);
  }

  async history(id: string, user: AuthenticatedUser) {
    const student = await this.findOne(id, user);

    const enrollments = await this.enrollments.find({
      where: { student: { id }, organizationId: user.organizationId },
      relations: { class: true },
      order: { academicYear: 'ASC', createdAt: 'ASC' },
    });

    const results = await this.results.find({
      where: { student: { id }, organizationId: user.organizationId },
      relations: { assessment: { term: true, class: true }, subject: true },
      order: { createdAt: 'ASC' },
    });

    const resultByAssessment = new Map<string, Result[]>();
    for (const result of results) {
      const key = result.assessment.id;
      const list = resultByAssessment.get(key) || [];
      list.push(result);
      resultByAssessment.set(key, list);
    }

    return {
      student: {
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        className: student.className,
        section: student.section,
        admissionDate: student.admissionDate,
        status: student.status,
      },
      enrollmentHistory: enrollments.map((enrollment) => ({
        id: enrollment.id,
        classId: enrollment.class?.id,
        className: enrollment.class?.name,
        section: enrollment.class?.section,
        academicYear: enrollment.academicYear,
        term: enrollment.term,
        isCurrent: enrollment.isCurrent,
        joinedAt: enrollment.createdAt,
      })),
      assessments: [...resultByAssessment.entries()].map(([assessmentId, entry]) => ({
        assessmentId,
        assessmentName: entry[0]?.assessment?.name,
        assessmentType: entry[0]?.assessment?.type,
        term: entry[0]?.assessment?.term?.name,
        className: entry[0]?.assessment?.class?.name,
        section: entry[0]?.assessment?.class?.section,
        examDate: entry[0]?.assessment?.examDate,
        subjectResults: entry.map((result) => ({
          subjectId: result.subject?.id,
          subjectName: result.subject?.name,
          obtainedMarks: Number(result.obtainedMarks),
          percentage: Number(result.percentage),
          grade: result.grade,
          isPassed: result.isPassed,
        })),
        totalObtained: entry.reduce((sum, result) => sum + Number(result.obtainedMarks), 0),
        totalMax: entry.reduce((sum, result) => sum + Number(result.assessment?.maximumMarks ?? 0), 0),
      })),
    };
  }
}