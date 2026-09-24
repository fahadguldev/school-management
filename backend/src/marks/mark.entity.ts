import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Student } from '../students/student.entity';
import { Subject } from '../subjects/subject.entity';
import { Assessment } from '../exams/assessment.entity';

@Entity('marks')
export class Mark extends BaseEntity {
  @ManyToOne(() => Student, (student) => student.marks)
  student!: Student;

  @ManyToOne(() => Subject, (subject) => subject.marks)
  subject!: Subject;

  @ManyToOne(() => Assessment, (assessment) => assessment.marks)
  assessment!: Assessment;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  obtainedMarks!: number;

  @Column({ type: 'boolean' })
  isAbsent!: boolean;

}
