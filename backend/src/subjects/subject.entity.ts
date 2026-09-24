import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Class } from '../classes/class.entity';
import { Teacher } from '../teachers/teacher.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { Assessment } from '../exams/assessment.entity';
import { Mark } from '../marks/mark.entity';
import { Result } from '../results/result.entity';

@Entity('subjects')
export class Subject extends BaseEntity {
  @Column()
  name!: string; // e.g., Mathematics, English, Physics

  @Column({ type: 'varchar', length: 10, nullable: true })
  code!: string | null; // e.g., MATH101

  @ManyToOne(() => Class, (cls) => cls.subjects)
  class?: Class;

  @ManyToOne(() => Teacher, { nullable: true })
  teacher?: Teacher;

  @OneToMany(() => TeacherAssignment, (assignment) => assignment.subject)
  teacherAssignments!: TeacherAssignment[];

  @OneToMany(() => Assessment, (assessment) => assessment.subject)
  assessments!: Assessment[];

  @OneToMany(() => Mark, (mark) => mark.subject)
  marks!: Mark[];

  @OneToMany(() => Result, (result) => result.subject)
  results!: Result[];
}
