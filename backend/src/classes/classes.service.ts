import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { TenantCrudService } from '../common/crud/tenant-crud.service';
import { Class } from './class.entity';

@Injectable()
export class ClassesService extends TenantCrudService<Class> {
  constructor(
    @InjectRepository(Class) repo: Repository<Class>,
    @InjectRepository(StudentEnrollment)
    private readonly enrollments: Repository<StudentEnrollment>,
    @InjectRepository(TeacherAssignment)
    private readonly assignments: Repository<TeacherAssignment>,
  ) {
    super(repo);
  }

  async findAllClasses(
    user: AuthenticatedUser,
    query?: { name?: string; section?: string; academicYear?: string },
  ): Promise<Class[]> {
    const where: any = { organizationId: user.organizationId, isActive: true };
    if (query?.name) where.name = query.name;
    if (query?.section) where.section = query.section;
    if (query?.academicYear) where.academicYear = query.academicYear;

    return this.repo.find({
      where,
      order: { name: 'ASC', section: 'ASC' },
    });
  }

  /**
   * Retrieves all sections across all classes with student counts and assigned class incharges.
   */
  async findSections(user: AuthenticatedUser) {
    const orgClasses = await this.repo.find({
      where: { organizationId: user.organizationId, isActive: true },
      order: { name: 'ASC', section: 'ASC' },
    });

    const enrollments = await this.enrollments.find({
      where: { organizationId: user.organizationId, isCurrent: true },
      relations: { class: true },
    });

    const incharges = await this.assignments.find({
      where: { organizationId: user.organizationId, isClassIncharge: true },
      relations: { teacher: true, class: true },
    });

    const classEnrollmentCount = new Map<string, number>();
    for (const enrollment of enrollments) {
      const classId = enrollment.class?.id;
      if (!classId) continue;
      classEnrollmentCount.set(classId, (classEnrollmentCount.get(classId) || 0) + 1);
    }

    const inchargeMap = new Map<string, any>();
    for (const asgn of incharges) {
      if (asgn.class?.id && asgn.teacher) {
        inchargeMap.set(asgn.class.id, {
          teacherId: asgn.teacher.id,
          name: `${asgn.teacher.firstName || ''} ${asgn.teacher.lastName || ''}`.trim(),
          employeeId: asgn.teacher.employeeId,
        });
      }
    }

    const byName = new Map<string, Class[]>();
    for (const cls of orgClasses) {
      const list = byName.get(cls.name) || [];
      list.push(cls);
      byName.set(cls.name, list);
    }

    return [...byName.entries()].map(([name, sections]) => ({
      className: name,
      totalSections: sections.length,
      totalStudents: sections.reduce((sum, cls) => sum + (classEnrollmentCount.get(cls.id) || 0), 0),
      sections: sections.map((cls) => ({
        classId: cls.id,
        section: cls.section,
        academicYear: cls.academicYear,
        studentCount: classEnrollmentCount.get(cls.id) || 0,
        incharge: inchargeMap.get(cls.id) || null,
      })),
    }));
  }

  /**
   * Retrieves all independent sections for a specific class (by ID or class name).
   */
  async getSectionsForClass(classIdOrName: string, user: AuthenticatedUser) {
    let className = classIdOrName;
    const existing = await this.repo.findOne({
      where: { id: classIdOrName, organizationId: user.organizationId },
    });
    if (existing) {
      className = existing.name;
    }

    const sections = await this.repo.find({
      where: { name: className, organizationId: user.organizationId, isActive: true },
      order: { section: 'ASC' },
    });

    if (!sections.length) {
      throw new NotFoundException(`No sections found for class '${classIdOrName}'`);
    }

    const enrollments = await this.enrollments.find({
      where: { organizationId: user.organizationId, isCurrent: true },
      relations: { class: true },
    });

    const incharges = await this.assignments.find({
      where: { organizationId: user.organizationId, isClassIncharge: true },
      relations: { teacher: true, class: true },
    });

    const countMap = new Map<string, number>();
    for (const e of enrollments) {
      if (e.class?.id) {
        countMap.set(e.class.id, (countMap.get(e.class.id) || 0) + 1);
      }
    }

    const inchargeMap = new Map<string, any>();
    for (const asgn of incharges) {
      if (asgn.class?.id && asgn.teacher) {
        inchargeMap.set(asgn.class.id, {
          teacherId: asgn.teacher.id,
          name: `${asgn.teacher.firstName || ''} ${asgn.teacher.lastName || ''}`.trim(),
        });
      }
    }

    return {
      className,
      totalSections: sections.length,
      sections: sections.map((s) => ({
        classId: s.id,
        name: s.name,
        section: s.section,
        academicYear: s.academicYear,
        studentCount: countMap.get(s.id) || 0,
        incharge: inchargeMap.get(s.id) || null,
      })),
    };
  }

  /**
   * Returns the student enrollment roster for a specific class section.
   */
  async getClassRoster(classId: string, user: AuthenticatedUser) {
    const cls = await this.findOne(classId, user);

    const enrollments = await this.enrollments.find({
      where: {
        organizationId: user.organizationId,
        class: { id: classId },
        isCurrent: true,
      },
      relations: { student: true },
      order: { createdAt: 'ASC' },
    });

    return {
      classId: cls.id,
      className: cls.name,
      section: cls.section,
      academicYear: cls.academicYear,
      studentCount: enrollments.length,
      students: enrollments.map((e) => ({
        enrollmentId: e.id,
        studentId: e.student.id,
        name: e.student.name,
        admissionNumber: e.student.admissionNumber,
        status: e.student.status,
        enrolledAt: e.createdAt,
      })),
    };
  }
}
