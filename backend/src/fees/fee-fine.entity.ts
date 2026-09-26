import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Fee } from './fee.entity';

@Entity('fee_fines')
export class FeeFine extends BaseEntity {
  @ManyToOne(() => Fee, { nullable: false, onDelete: 'CASCADE' })
  fee!: Fee;

  @Column({ type: 'varchar', length: 20 })
  fineType!: 'FIXED' | 'PERCENTAGE';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value!: number;

  @Column({ type: 'integer', default: 0 })
  gracePeriodDays!: number;
}
