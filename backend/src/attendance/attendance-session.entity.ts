import { Column, Entity, ManyToOne, OneToMany, Unique } from 'typeorm';
import { Class } from '../classes/class.entity';
import { BaseEntity } from '../common/database/base.entity';
import { User } from '../users/user.entity';
import { AttendanceRecord } from './attendance-record.entity';

@Entity('attendance_sessions')
@Unique(['organizationId', 'class', 'attendanceDate', 'period'])
export class AttendanceSession extends BaseEntity {
  @ManyToOne(() => Class, { nullable: false })
  class!: Class;

  @Column({ type: 'date' })
  attendanceDate!: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  period!: string | null;

  @Column({ type: 'boolean', default: false })
  locked!: boolean;

  @ManyToOne(() => User, { nullable: false })
  createdBy!: User;

  @OneToMany(() => AttendanceRecord, (record) => record.session)
  records!: AttendanceRecord[];
}
