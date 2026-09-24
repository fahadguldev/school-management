import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Term } from './term.entity';
import { Assessment } from '../exams/assessment.entity';

@Entity('academic_years')
export class AcademicYear extends BaseEntity {
  @Column()
  name!: string; // e.g., '2024-2025'

  @Column({ type: 'boolean' })
  isCurrent!: boolean;

  @OneToMany(() => Term, (term) => term.academicYear)
  terms!: Term[];

  @OneToMany(() => Assessment, (assessment) => assessment.academicYear)
  assessments!: Assessment[];
}
