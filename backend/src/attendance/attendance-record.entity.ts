import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Student } from '../students/student.entity';
import { User } from '../users/user.entity';
import { AttendanceSession } from './attendance-session.entity';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';

@Entity('attendance_records')
@Unique(['session', 'student'])
export class AttendanceRecord extends BaseEntity {
  @ManyToOne(() => AttendanceSession, (session) => session.records, { onDelete: 'CASCADE' })
  session!: AttendanceSession;

  @ManyToOne(() => Student, { nullable: false })
  student!: Student;

  @Column({ type: 'varchar', length: 20, default: 'PRESENT' })
  status!: AttendanceStatus;

  @ManyToOne(() => User, { nullable: false })
  markedBy!: User;

  @Column({ type: 'timestamp' })
  markedAt!: Date;
}
