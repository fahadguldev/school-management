import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { User } from '../users/user.entity';
import { AttendanceRecord, AttendanceStatus } from './attendance-record.entity';

@Entity('attendance_correction_requests')
export class AttendanceCorrectionRequest extends BaseEntity {
  @ManyToOne(() => AttendanceRecord, { nullable: false })
  record!: AttendanceRecord;

  @Column({ type: 'varchar', length: 20 })
  oldStatus!: AttendanceStatus;

  @Column({ type: 'varchar', length: 20 })
  requestedStatus!: AttendanceStatus;

  @Column({ type: 'text' })
  reason!: string;

  @ManyToOne(() => User, { nullable: false })
  requestedBy!: User;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @ManyToOne(() => User, { nullable: true })
  reviewedBy!: User | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewReason!: string | null;
}
