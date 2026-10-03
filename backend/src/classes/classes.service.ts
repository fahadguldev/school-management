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

  /**
   * Per-section enrollment counts and class-incharge details, keyed by class id.
   */
  private async rollupMaps(user: AuthenticatedUser) {
    const [enrollments, incharges] = await Promise.all([
      this.enrollments.find({
        where: { organizationId: user.organizationId, isCurrent: true },
        relations: { class: true },
      }),
      this.assignments.find({
        where: { organizationId: user.organizationId, isClassIncharge: true },
        relations: { teacher: true, class: true },
      }),
    ]);

    const enrollmentCount = new Map<string, number>();
    for (const e of enrollments) {
      const classId = e.class?.id;
      if (classId) enrollmentCount.set(classId, (enrollmentCount.get(classId) || 0) + 1);
    }

    const inchargeByClassId = new Map<string, any>();
    for (const asgn of incharges) {
      if (asgn.class?.id && asgn.teacher) {
        inchargeByClassId.set(asgn.class.id, {
          teacherId: asgn.teacher.id,
          name: `${asgn.teacher.firstName || ''} ${asgn.teacher.lastName || ''}`.trim(),
          employeeId: asgn.teacher.employeeId,
        });
      }
    }

    return { enrollmentCount, inchargeByClassId };
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

    const { enrollmentCount, inchargeByClassId } = await this.rollupMaps(user);

    const byName = new Map<string, Class[]>();
    for (const cls of orgClasses) {
      const list = byName.get(cls.name) || [];
      list.push(cls);
      byName.set(cls.name, list);
    }

    return [...byName.entries()].map(([name, sections]) => ({
      className: name,
      totalSections: sections.length,
      totalStudents: sections.reduce((sum, cls) => sum + (enrollmentCount.get(cls.id) || 0), 0),
      sections: sections.map((cls) => ({
        classId: cls.id,
        section: cls.section,
        academicYear: cls.academicYear,
        studentCount: enrollmentCount.get(cls.id) || 0,
        incharge: inchargeByClassId.get(cls.id) || null,
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

    const { enrollmentCount, inchargeByClassId } = await this.rollupMaps(user);

    return {
      className,
      totalSections: sections.length,
      sections: sections.map((s) => ({
        classId: s.id,
        name: s.name,
        section: s.section,
        academicYear: s.academicYear,
        studentCount: enrollmentCount.get(s.id) || 0,
        incharge: inchargeByClassId.get(s.id) || null,
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
