import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { User } from '../users/user.entity';
import { Mark } from './mark.entity';

@Entity('marks_correction_requests')
export class MarksCorrectionRequest extends BaseEntity {
  @ManyToOne(() => Mark, { nullable: false })
  mark!: Mark;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  oldValue!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  requestedValue!: number;

  @Column({ type: 'text' })
  reason!: string;

  @ManyToOne(() => User, { nullable: false })
  requestedBy!: User;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @ManyToOne(() => User, { nullable: true })
  reviewedBy!: User | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewReason!: string | null;
}
