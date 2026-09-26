import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as XLSX from 'xlsx';
import { DataSource, In, Repository } from 'typeorm';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { AuditService } from '../audit/audit.service';
import { Class } from '../classes/class.entity';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { FeeStructure } from '../fees/fee-structure.entity';
import { GuardianContact } from '../notifications/guardian-contact.entity';
import { Student } from '../students/student.entity';

type ImportKind = 'students' | 'fee-structures';

@Injectable()
export class OperationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(StudentEnrollment) private readonly enrollments: Repository<StudentEnrollment>,
    @InjectRepository(Class) private readonly classes: Repository<Class>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly audit: AuditService,
  ) {}

  template(kind: ImportKind) {
    if (kind === 'fee-structures') {
      return { columns: ['name', 'amount', 'frequency'], csvTemplate: 'name,amount,frequency\nTuition Fee,5000,monthly\n' };
    }
    return {
      columns: ['admissionNumber', 'name', 'dateOfBirth', 'gender', 'className', 'section', 'guardianName', 'primaryPhone', 'secondaryPhone'],
      csvTemplate: 'admissionNumber,name,dateOfBirth,gender,className,section,guardianName,primaryPhone,secondaryPhone\nADM-001,Student Name,2012-01-15,Male,8,A,Guardian Name,+923001234567,\n',
    };
  }

  parseFile(file: { buffer: Buffer; originalname: string }) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  }

  async import(kind: ImportKind, rows: Record<string, any>[], user: AuthenticatedUser) {
    if (!rows.length) throw new BadRequestException('Import file contains no rows');
    const errors = kind === 'students' ? await this.validateStudents(rows, user) : this.validateFeeStructures(rows);
    if (errors.length) throw new BadRequestException({ message: 'Import validation failed; no rows were committed', errors });
    const result = await this.dataSource.transaction(async (manager) => {
      if (kind === 'fee-structures') {
        const repository = manager.getRepository(FeeStructure);
        const saved = await repository.save(rows.map((row) => repository.create({
          organizationId: user.organizationId,
          name: String(row.name).trim(),
          amount: Number(row.amount),
          frequency: String(row.frequency).trim().toLowerCase(),
        })));
        return { imported: saved.length, ids: saved.map((item) => item.id) };
      }
      const studentRepo = manager.getRepository(Student);
      const contactRepo = manager.getRepository(GuardianContact);
      const savedIds: string[] = [];
      for (const row of rows) {
        const student = await studentRepo.save(studentRepo.create({
          organizationId: user.organizationId,
          admissionNumber: String(row.admissionNumber).trim(),
          name: String(row.name).trim(),
          fatherGuardianName: String(row.guardianName || '').trim() || null,
          dateOfBirth: new Date(row.dateOfBirth),
          gender: String(row.gender || 'Not Specified'),
          contactInformation: String(row.primaryPhone).trim(),
          className: String(row.className || '').trim() || null,
          section: String(row.section || '').trim() || null,
          admissionDate: new Date(),
          status: true,
          isActive: true,
        }));
        const phones = [row.primaryPhone, row.secondaryPhone].map((phone) => String(phone || '').trim()).filter(Boolean);
        await contactRepo.save(phones.map((phone, index) => contactRepo.create({
          organizationId: user.organizationId,
          student,
          phoneNumber: phone,
          isPrimary: index === 0,
        })));
        savedIds.push(student.id);
      }
      return { imported: savedIds.length, ids: savedIds };
    });
    await this.audit.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: `BULK_IMPORT_${kind.toUpperCase().replace('-', '_')}`,
      resource: kind,
      newValue: { imported: result.imported },
    });
    return { success: true, ...result };
  }

  async promote(
    payload: { sourceClassId: string; targetClassId: string; academicYear: string; term?: string; holdBackStudentIds?: string[] },
    user: AuthenticatedUser,
  ) {
    const [source, target] = await Promise.all([
      this.classes.findOne({ where: { id: payload.sourceClassId, organizationId: user.organizationId } }),
      this.classes.findOne({ where: { id: payload.targetClassId, organizationId: user.organizationId } }),
    ]);
    if (!source || !target) throw new NotFoundException('Source or target class not found');
    if (!payload.academicYear?.trim()) throw new BadRequestException('academicYear is required');
    const current = await this.enrollments.find({
      where: { organizationId: user.organizationId, class: { id: source.id }, isCurrent: true },
      relations: { student: true },
    });
    const holdBack = new Set(payload.holdBackStudentIds || []);
    const promoted = current.filter((enrollment) => !holdBack.has(enrollment.student.id));
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(StudentEnrollment);
      const studentRepository = manager.getRepository(Student);
      if (promoted.length) {
        await repository.update({ id: In(promoted.map((item) => item.id)) }, { isCurrent: false });
        await repository.save(promoted.map((item) => repository.create({
          organizationId: user.organizationId,
          student: item.student,
          class: target,
          academicYear: payload.academicYear,
          term: payload.term || 'Term 1',
          isCurrent: true,
        })));
        for (const item of promoted) {
          item.student.className = target.name;
          item.student.section = target.section;
          await studentRepository.save(item.student);
        }
      }
    });
    await this.audit.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'YEAR_END_PROMOTION',
      resource: 'enrollments',
      oldValue: { sourceClassId: source.id },
      newValue: { targetClassId: target.id, academicYear: payload.academicYear, promoted: promoted.length, heldBack: holdBack.size },
    });
    return { promoted: promoted.length, heldBack: current.filter((item) => holdBack.has(item.student.id)).map((item) => item.student) };
  }

  private async validateStudents(rows: Record<string, any>[], user: AuthenticatedUser) {
    const errors: { row: number; field: string; message: string }[] = [];
    const admissions = new Set<string>();
    const existing = await this.students.find({ where: { organizationId: user.organizationId } });
    const existingAdmissions = new Set(existing.map((student) => student.admissionNumber));
    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      for (const field of ['admissionNumber', 'name', 'dateOfBirth', 'primaryPhone']) {
        if (!String(row[field] || '').trim()) errors.push({ row: rowNumber, field, message: 'Required' });
      }
      const admission = String(row.admissionNumber || '').trim();
      if (admissions.has(admission) || existingAdmissions.has(admission)) errors.push({ row: rowNumber, field: 'admissionNumber', message: 'Duplicate admission number' });
      admissions.add(admission);
      if (row.dateOfBirth && Number.isNaN(new Date(row.dateOfBirth).getTime())) errors.push({ row: rowNumber, field: 'dateOfBirth', message: 'Invalid date' });
      for (const field of ['primaryPhone', 'secondaryPhone']) {
        if (row[field] && !/^\+?[0-9]{7,15}$/.test(String(row[field]).trim())) errors.push({ row: rowNumber, field, message: 'Invalid phone number' });
      }
    });
    return errors;
  }

  private validateFeeStructures(rows: Record<string, any>[]) {
    const errors: { row: number; field: string; message: string }[] = [];
    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      if (!String(row.name || '').trim()) errors.push({ row: rowNumber, field: 'name', message: 'Required' });
      if (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0) errors.push({ row: rowNumber, field: 'amount', message: 'Must be a positive number' });
      if (!String(row.frequency || '').trim()) errors.push({ row: rowNumber, field: 'frequency', message: 'Required' });
    });
    return errors;
  }
}
