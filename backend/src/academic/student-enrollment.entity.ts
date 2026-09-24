import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Student } from '../students/student.entity';
import { Class } from '../classes/class.entity';

@Entity('student_enrollments')
export class StudentEnrollment extends BaseEntity {
  @ManyToOne(() => Student, (student) => student.enrollments)
  student!: Student;

  @ManyToOne(() => Class, (cls) => cls.enrollments)
  class!: Class;

  @Column({ type: 'varchar', length: 20 })
  academicYear!: string;

  @Column({ type: 'varchar', length: 20 })
  term!: string;

  @Column({ type: 'boolean', default: true })
  isCurrent!: boolean;

}
