import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column()
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  academicYear!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Term 1' })
  currentTerm!: string;

  @Column({ type: 'varchar', length: 20, default: 'daily' })
  attendanceGranularity!: 'daily' | 'period';

  @Column({ type: 'integer', default: 2 })
  attendanceLockDays!: number;

  @Column({ type: 'varchar', length: 30, default: 'admin_marked' })
  staffAttendanceMode!: 'admin_marked' | 'self_with_approval';

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  classPassDropAlertPercent!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 75 })
  attendanceAlertPercent!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 80 })
  feeCollectionTargetPercent!: number;

  @Column({ type: 'boolean', default: true })
  status!: boolean;
}
