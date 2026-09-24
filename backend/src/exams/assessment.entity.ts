import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Class } from '../classes/class.entity';
import { Subject } from '../subjects/subject.entity';
import { AcademicYear } from '../academic/academic-year.entity';
import { Term } from '../academic/term.entity';
import { Mark } from '../marks/mark.entity';
import { Result } from '../results/result.entity';

@Entity('assessments')
export class Assessment extends BaseEntity {
  @Column()
  name!: string; // e.g., 'Midterm Exam', 'Monthly Test'

  @Column()
  type!: string; // Test, Monthly Test, Exam, Term Exam

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  maximumMarks!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  passingMarks!: number;

  @Column()
  examDate!: Date;

  // Use a generic varchar so the schema is compatible with sqlite fallback. Values remain: 'Draft','Open','Marks Entry','Completed','Published'
  @Column({ type: 'varchar', length: 50, default: 'Draft' })
  status!: string;

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @ManyToOne(() => Class, (cls) => cls.assessments)
  class?: Class;

  @ManyToOne(() => Subject, (subject) => subject.assessments)
  subject?: Subject;

  @ManyToOne(() => AcademicYear, (ay) => ay.assessments)
  academicYear?: AcademicYear;

  @ManyToOne(() => Term, (term) => term.assessments)
  term?: Term;

  @OneToMany(() => Mark, (mark) => mark.assessment)
  marks!: Mark[];

  @OneToMany(() => Result, (result) => result.assessment)
  results!: Result[];
}
