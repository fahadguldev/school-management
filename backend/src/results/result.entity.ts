import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Student } from '../students/student.entity';
import { Subject } from '../subjects/subject.entity';
import { Assessment } from '../exams/assessment.entity';

@Entity('results')
export class Result extends BaseEntity {
  @ManyToOne(() => Student, (student) => student.results)
  student!: Student;

  @ManyToOne(() => Subject, (subject) => subject.results)
  subject?: Subject;

  @ManyToOne(() => Assessment, (assessment) => assessment.results)
  assessment!: Assessment;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  obtainedMarks!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage!: number;

  @Column({ type: 'varchar', length: 2 })
  grade!: string; // A, B, C, D, F or 1, 2, 3, 4, 5

  @Column({ type: 'boolean' })
  isPassed!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  subjectAverage!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  classAverage!: number;

}
