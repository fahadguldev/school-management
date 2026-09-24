import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { Teacher } from '../teachers/teacher.entity';
import { Class } from '../classes/class.entity';
import { Subject } from '../subjects/subject.entity';

@Entity('teacher_assignments')
export class TeacherAssignment extends BaseEntity {
  @ManyToOne(() => Teacher, (teacher) => teacher.assignments)
  teacher!: Teacher;

  @ManyToOne(() => Class, (cls) => cls.teacherAssignments)
  class?: Class;

  @ManyToOne(() => Subject, (subject) => subject.teacherAssignments)
  subject!: Subject;

  @Column({ type: 'boolean', default: true })
  isClassIncharge!: boolean;

}
