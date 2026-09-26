import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Student } from '../students/student.entity';

@Entity('guardian_contacts')
export class GuardianContact extends BaseEntity {
  @ManyToOne(() => Student, { nullable: false, onDelete: 'CASCADE' })
  student!: Student;

  @Column({ type: 'varchar', length: 30 })
  phoneNumber!: string;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;
}
