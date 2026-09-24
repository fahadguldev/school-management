import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Fee } from './fee.entity';

@Entity('fee_structures')
export class FeeStructure extends BaseEntity {
  @Column()
  name!: string; // e.g., 'Annual Fee', 'Tuition Fee', 'Exam Fee'

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 50 })
  frequency!: string; // monthly, quarterly, annually, one-time

  @OneToMany(() => Fee, (fee) => fee.feeStructure)
  fees!: Fee[];
}
