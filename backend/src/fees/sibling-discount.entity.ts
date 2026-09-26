import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Student } from '../students/student.entity';

@Entity('sibling_discounts')
export class SiblingDiscount extends BaseEntity {
  @ManyToOne(() => Student, { nullable: false, onDelete: 'CASCADE' })
  student!: Student;

  @Column({ type: 'varchar', length: 20 })
  discountType!: 'FLAT' | 'PERCENTAGE';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value!: number;
}
