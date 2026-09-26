import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Student } from '../students/student.entity';

export type NotificationTrigger =
  | 'STUDENT_ABSENT'
  | 'RESULT_PUBLISHED'
  | 'FEE_DUE'
  | 'FEE_PAID'
  | 'PRINCIPAL_ALERT';

@Entity('notification_logs')
export class NotificationLog extends BaseEntity {
  @ManyToOne(() => Student, { nullable: true, onDelete: 'SET NULL' })
  student!: Student | null;

  @Column({ type: 'varchar', length: 40 })
  triggerType!: NotificationTrigger;

  @Column({ type: 'text' })
  messageBody!: string;

  @Column({ type: 'varchar', length: 30 })
  recipientNumber!: string;

  @Column({ type: 'varchar', length: 20, default: 'QUEUED' })
  status!: 'QUEUED' | 'SENT' | 'FAILED';

  @Column({ type: 'datetime', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'integer', default: 0 })
  retryCount!: number;

  @Column({ type: 'text', nullable: true })
  failureReason!: string | null;
}
