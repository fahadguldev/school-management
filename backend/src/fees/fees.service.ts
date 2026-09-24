import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { Student } from '../students/student.entity';
import { FeeStructure } from './fee-structure.entity';
import { Fee } from './fee.entity';
import { Payment } from './payment.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FeesService {
  constructor(
    @InjectRepository(FeeStructure)
    private readonly feeStructures: Repository<FeeStructure>,
    @InjectRepository(Fee)
    private readonly fees: Repository<Fee>,
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    private readonly auditService: AuditService,
  ) {}

  findStructures(user: AuthenticatedUser) {
    return this.feeStructures.find({ where: { organizationId: user.organizationId } });
  }

  createStructure(payload: Partial<FeeStructure>, user: AuthenticatedUser) {
    return this.feeStructures.save(
      this.feeStructures.create({ ...payload, organizationId: user.organizationId }),
    );
  }

  findFees(user: AuthenticatedUser) {
    return this.fees.find({
      where: { organizationId: user.organizationId },
      relations: { student: true, feeStructure: true, payments: true },
    });
  }

  async createFee(
    payload: Partial<Fee> & { studentId: string; feeStructureId: string },
    user: AuthenticatedUser,
  ) {
    const fee = await this.fees.save(
      this.fees.create({
        ...payload,
        paidAmount: payload.paidAmount ?? 0,
        organizationId: user.organizationId,
        student: { id: payload.studentId },
        feeStructure: { id: payload.feeStructureId },
      }),
    );

    await this.auditService.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE_FEE',
      resource: 'fees',
      newValue: { feeId: fee.id, amount: fee.amount, studentId: payload.studentId },
    });

    return fee;
  }

  async markPaid(
    feeId: string,
    payload: { amount: number; paymentMethod: string; transactionId?: string; receiptNumber?: string },
    user: AuthenticatedUser,
  ) {
    const fee = await this.fees.findOne({
      where: { id: feeId, organizationId: user.organizationId },
      relations: { payments: true },
    });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    if (Number(payload.amount) <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    const payment = await this.payments.save(
      this.payments.create({
        organizationId: user.organizationId,
        fee,
        processedBy: { id: user.id },
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        transactionId: payload.transactionId || `manual-${Date.now()}`,
        paymentDate: new Date(),
        receiptNumber: payload.receiptNumber ?? null,
      }),
    );

    fee.paidAmount = Number(fee.paidAmount || 0) + Number(payload.amount);
    fee.isPaid = fee.paidAmount >= Number(fee.amount);
    fee.paymentDate = fee.isPaid ? new Date() : fee.paymentDate;
    fee.paymentMode = payload.paymentMethod;
    fee.transactionId = payment.transactionId;
    await this.fees.save(fee);

    await this.auditService.recordLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'PAYMENT_RECEIVED',
      resource: 'fees',
      oldValue: { feeId, previousPaidAmount: Number(fee.paidAmount) - Number(payload.amount), isPaid: false },
      newValue: {
        feeId,
        newPaidAmount: fee.paidAmount,
        isPaid: fee.isPaid,
        amountReceived: payload.amount,
        paymentMethod: payload.paymentMethod,
        receiptNumber: payment.receiptNumber,
      },
    });

    return { fee, payment };
  }

  async markUnpaid(feeId: string, user: AuthenticatedUser) {
    const fee = await this.fees.findOne({ where: { id: feeId, organizationId: user.organizationId } });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    fee.isPaid = false;
    fee.paidAmount = 0;
    fee.paymentDate = null;
    return this.fees.save(fee);
  }

  paymentHistory(feeId: string, user: AuthenticatedUser) {
    return this.payments.find({
      where: { fee: { id: feeId }, organizationId: user.organizationId },
      relations: { fee: true, processedBy: true },
    });
  }

  /**
   * Generates official three-part Fee Challan voucher (Bank Copy, School Copy, Student Copy).
   */
  async generateChallan(feeId: string, user: AuthenticatedUser) {
    const fee = await this.fees.findOne({
      where: { id: feeId, organizationId: user.organizationId },
      relations: { student: true, feeStructure: true, payments: true },
    });

    if (!fee) {
      throw new NotFoundException('Fee record not found');
    }

    const totalAmount = Number(fee.amount);
    const paidAmount = Number(fee.paidAmount || 0);
    const balanceDue = Math.max(0, totalAmount - paidAmount);
    const challanCode = `CHL-${new Date().getFullYear()}-${fee.id.slice(0, 8).toUpperCase()}`;

    const today = new Date();
    const dueDate = new Date(fee.dueDate);
    const isOverdue = !fee.isPaid && today > dueDate;

    const baseSlip = {
      challanNumber: challanCode,
      organizationId: user.organizationId,
      issueDate: fee.createdAt ? new Date(fee.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: fee.dueDate,
      student: {
        id: fee.student?.id,
        name: fee.student?.name || 'Unassigned Student',
        admissionNumber: fee.student?.admissionNumber || 'N/A',
        className: fee.student?.className || 'N/A',
        section: fee.student?.section || 'N/A',
      },
      feeStructure: {
        id: fee.feeStructure?.id,
        name: fee.feeStructure?.name || 'General Tuition',
      },
      paymentSummary: {
        totalAmount,
        paidAmount,
        balanceDue,
        status: fee.isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING',
        isPaid: fee.isPaid,
      },
      bankInstructions: {
        accountTitle: 'EduSaaS Academic Collection Account',
        accountNumber: 'PK98-EDUS-0091-2384-001',
        branchCode: '0412',
        lateFeePolicy: 'A late fee surcharge of 5% applies after due date.',
      },
    };

    return {
      challanNumber: challanCode,
      feeId: fee.id,
      generatedAt: new Date().toISOString(),
      voucher: baseSlip,
      copies: [
        { copyType: 'BANK_COPY', title: 'Bank Copy (To be retained by receiving bank branch)', ...baseSlip },
        { copyType: 'INSTITUTION_COPY', title: 'School Accounts Copy (To be returned to school counter)', ...baseSlip },
        { copyType: 'STUDENT_COPY', title: 'Student Copy (To be retained by student/guardian)', ...baseSlip },
      ],
    };
  }

  /**
   * Scoped Student Fee Portal:
   * Resolves the student profile and returns only fees belonging to that student.
   */
  async getStudentFees(user: AuthenticatedUser, targetStudentId?: string) {
    let student: Student | null = null;

    if (user.role === 'STUDENT') {
      student = await this.students.findOne({
        where: { organizationId: user.organizationId, user: { id: user.id } },
      });
      if (!student) {
        // Fallback search by email or name if user entity not linked directly
        student = await this.students.findOne({
          where: { organizationId: user.organizationId, contactInformation: user.email },
        });
      }
    } else if (targetStudentId) {
      student = await this.students.findOne({
        where: { id: targetStudentId, organizationId: user.organizationId },
      });
    }

    if (!student && user.role === 'STUDENT') {
      // If student profile not yet linked, return empty portal structure
      return {
        student: null,
        summary: { totalFees: 0, paidCount: 0, unpaidCount: 0, totalDue: 0, totalPaid: 0 },
        currentDues: [],
        paidHistory: [],
      };
    }

    const where: any = { organizationId: user.organizationId };
    if (student) {
      where.student = { id: student.id };
    }

    const studentFees = await this.fees.find({
      where,
      relations: { feeStructure: true, payments: true, student: true },
      order: { dueDate: 'DESC' },
    });

    const currentDues = studentFees
      .filter((f) => !f.isPaid)
      .map((f) => ({
        feeId: f.id,
        feeName: f.feeStructure?.name || 'Tuition Fee',
        amount: Number(f.amount),
        paidAmount: Number(f.paidAmount || 0),
        balanceDue: Number(f.amount) - Number(f.paidAmount || 0),
        dueDate: f.dueDate,
        isOverdue: new Date() > new Date(f.dueDate),
        challanNumber: `CHL-${new Date().getFullYear()}-${f.id.slice(0, 8).toUpperCase()}`,
      }));

    const paidHistory = studentFees
      .filter((f) => f.isPaid || Number(f.paidAmount || 0) > 0)
      .map((f) => ({
        feeId: f.id,
        feeName: f.feeStructure?.name || 'Tuition Fee',
        amount: Number(f.amount),
        paidAmount: Number(f.paidAmount || 0),
        paymentDate: f.paymentDate,
        paymentMode: f.paymentMode,
        transactionId: f.transactionId,
        payments: f.payments,
      }));

    const totalDue = currentDues.reduce((sum, f) => sum + f.balanceDue, 0);
    const totalPaid = paidHistory.reduce((sum, f) => sum + f.paidAmount, 0);

    return {
      student: student
        ? {
            id: student.id,
            name: student.name,
            admissionNumber: student.admissionNumber,
            className: student.className,
            section: student.section,
          }
        : null,
      summary: {
        totalFees: studentFees.length,
        paidCount: paidHistory.length,
        unpaidCount: currentDues.length,
        totalDue,
        totalPaid,
      },
      currentDues,
      paidHistory,
    };
  }
}
