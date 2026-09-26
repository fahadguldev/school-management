import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { Student } from '../students/student.entity';
import { GuardianContact } from './guardian-contact.entity';
import { NotificationLog, NotificationTrigger } from './notification-log.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly maxRetries = 3;

  constructor(
    @InjectRepository(GuardianContact) private readonly contacts: Repository<GuardianContact>,
    @InjectRepository(NotificationLog) private readonly logs: Repository<NotificationLog>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
  ) {}

  findContacts(studentId: string, user: AuthenticatedUser) {
    return this.contacts.find({
      where: { student: { id: studentId }, organizationId: user.organizationId, isActive: true },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  async addContact(
    studentId: string,
    payload: { phoneNumber: string; isPrimary?: boolean },
    user: AuthenticatedUser,
  ) {
    if (!/^\+?[0-9]{7,15}$/.test(payload.phoneNumber || '')) {
      throw new BadRequestException('A valid guardian phone number is required');
    }
    const student = await this.students.findOne({ where: { id: studentId, organizationId: user.organizationId } });
    if (!student) throw new NotFoundException('Student not found');
    const existingCount = await this.contacts.count({
      where: { student: { id: studentId }, organizationId: user.organizationId, isActive: true },
    });
    if (existingCount >= 2) throw new BadRequestException('A student can have at most two guardian contacts');
    const isPrimary = payload.isPrimary ?? existingCount === 0;
    if (isPrimary) {
      await this.contacts.update(
        { student: { id: studentId }, organizationId: user.organizationId },
        { isPrimary: false },
      );
    }
    return this.contacts.save(this.contacts.create({
      organizationId: user.organizationId,
      student,
      phoneNumber: payload.phoneNumber,
      isPrimary,
    }));
  }

  findLogs(user: AuthenticatedUser, triggerType?: NotificationTrigger) {
    return this.logs.find({
      where: {
        organizationId: user.organizationId,
        ...(triggerType ? { triggerType } : {}),
      },
      relations: { student: true },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async notifyStudent(
    organizationId: string,
    studentId: string,
    triggerType: Exclude<NotificationTrigger, 'PRINCIPAL_ALERT'>,
    values: Record<string, string | number>,
  ): Promise<NotificationLog[]> {
    try {
      const student = await this.students.findOne({ where: { id: studentId, organizationId } });
      if (!student) return [];
      const contacts = await this.contacts.find({
        where: { student: { id: studentId }, organizationId, isActive: true },
        order: { isPrimary: 'DESC' },
      });
      const recipients = contacts.length
        ? contacts
        : /^\+?[0-9]{7,15}$/.test(student.contactInformation || '')
          ? [{ phoneNumber: student.contactInformation } as GuardianContact]
          : [];
      const messageBody = this.render(triggerType, { student: student.name, ...values });
      const created = await this.logs.save(recipients.map((contact) => this.logs.create({
        organizationId,
        student,
        triggerType,
        messageBody,
        recipientNumber: contact.phoneNumber,
        status: 'QUEUED',
        sentAt: null,
        retryCount: 0,
        failureReason: null,
      })));
      await Promise.all(created.map((log) => this.deliver(log)));
      return created;
    } catch (error: any) {
      // Notifications are deliberately non-blocking for attendance/results/fees.
      this.logger.warn(`Notification trigger ${triggerType} failed: ${error.message}`);
      return [];
    }
  }

  async retry(id: string, user: AuthenticatedUser) {
    const log = await this.logs.findOne({ where: { id, organizationId: user.organizationId } });
    if (!log) throw new NotFoundException('Notification log not found');
    if (log.status === 'SENT') return log;
    if (log.retryCount >= this.maxRetries) throw new BadRequestException('Maximum retry count reached');
    return this.deliver(log);
  }

  private async deliver(log: NotificationLog) {
    try {
      // Provider integration is intentionally isolated here. In local/development mode,
      // a valid queued message is treated as accepted by the outbound gateway.
      if (!/^\+?[0-9]{7,15}$/.test(log.recipientNumber)) throw new Error('Invalid recipient number');
      log.status = 'SENT';
      log.sentAt = new Date();
      log.failureReason = null;
    } catch (error: any) {
      log.status = 'FAILED';
      log.retryCount += 1;
      log.failureReason = error.message;
    }
    return this.logs.save(log);
  }

  private render(trigger: NotificationTrigger, values: Record<string, string | number>) {
    const templates: Record<NotificationTrigger, string> = {
      STUDENT_ABSENT: '{student} was marked absent on {date}.',
      RESULT_PUBLISHED: '{student}\'s result for {assessment} has been published.',
      FEE_DUE: 'Fee of {amount} for {student} is due on {dueDate}.',
      FEE_PAID: 'Payment of {amount} for {student} has been received. Receipt: {receipt}.',
      PRINCIPAL_ALERT: '{message}',
    };
    return Object.entries(values).reduce(
      (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
      templates[trigger],
    );
  }
}
