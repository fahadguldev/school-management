import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { User } from '../users/user.entity';
import { AttendanceStatus } from './attendance-record.entity';

@Entity('staff_attendance_records')
@Unique(['organizationId', 'staff', 'attendanceDate'])
export class StaffAttendanceRecord extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  staff!: User;

  @Column({ type: 'date' })
  attendanceDate!: Date;

  @Column({ type: 'varchar', length: 20 })
  status!: AttendanceStatus;

  @ManyToOne(() => User, { nullable: false })
  markedBy!: User;

  @Column({ type: 'boolean', default: true })
  approved!: boolean;
}
