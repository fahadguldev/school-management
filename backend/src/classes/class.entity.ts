import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { Subject } from '../subjects/subject.entity';
import { Assessment } from '../exams/assessment.entity';

@Entity('classes')
export class Class extends BaseEntity {
  @Column()
  name!: string; // e.g., '8', '10', '12'

  @Column({ type: 'varchar', length: 20 })
  section!: string; // e.g., 'A', 'B', 'C'

  @Column()
  academicYear!: string;

  @OneToMany(() => StudentEnrollment, (enrollment) => enrollment.class)
  enrollments!: StudentEnrollment[];

  @OneToMany(() => TeacherAssignment, (assignment) => assignment.class)
  teacherAssignments!: TeacherAssignment[];

  @OneToMany(() => Subject, (subject) => subject.class)
  subjects!: Subject[];

  @OneToMany(() => Assessment, (assessment) => assessment.class)
  assessments!: Assessment[];
}
