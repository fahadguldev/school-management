import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { User } from '../users/user.entity';

@Entity('staff_leave_requests')
export class StaffLeaveRequest extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  staff!: User;

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date' })
  endDate!: Date;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @ManyToOne(() => User, { nullable: true })
  approvedBy!: User | null;
}
