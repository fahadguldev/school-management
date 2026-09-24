import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Fee } from './fee.entity';
import { User } from '../users/user.entity';

@Entity('payments')
export class Payment extends BaseEntity {
  @ManyToOne(() => Fee, (fee) => fee.payments)
  fee!: Fee;

  @ManyToOne(() => User, { nullable: true })
  processedBy?: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column()
  paymentMethod!: string; // cash, card, bank transfer, etc.

  @Column()
  transactionId!: string;

  @Column({ type: 'date' })
  paymentDate!: Date;

  @Column({ type: 'text', nullable: true })
  receiptNumber!: string | null;

}
