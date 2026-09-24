import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { AcademicYear } from './academic-year.entity';
import { Assessment } from '../exams/assessment.entity';

@Entity('terms')
export class Term extends BaseEntity {
  @Column()
  name!: string; // e.g., 'Term 1', 'Term 2', 'Semester 1'

  @Column()
  order!: number; // for ordering terms

  @ManyToOne(() => AcademicYear, (ay) => ay.terms)
  academicYear?: AcademicYear;

  @OneToMany(() => Assessment, (assessment) => assessment.term)
  assessments!: Assessment[];
}
