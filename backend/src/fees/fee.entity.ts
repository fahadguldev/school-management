import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Student } from '../students/student.entity';
import { FeeStructure } from './fee-structure.entity';
import { Payment } from './payment.entity';

@Entity('fees')
export class Fee extends BaseEntity {
  @ManyToOne(() => Student, (student) => student.fees)
  student!: Student;

  @ManyToOne(() => FeeStructure, (feeStructure) => feeStructure.fees)
  feeStructure!: FeeStructure;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalAmount!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  paidAmount!: number; // cumulative paid amount

  @Column()
  dueDate!: Date;

  @Column({ type: 'boolean', default: false })
  isPaid!: boolean;

  @Column({ type: 'date', nullable: true })
  paymentDate!: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  challanNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  paymentMode!: string | null;

  @Column({ type: 'text', nullable: true })
  transactionId!: string | null;

  @OneToMany(() => Payment, (payment) => payment.fee)
  payments!: Payment[];
}
