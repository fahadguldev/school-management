import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { User } from '../users/user.entity';

@Entity('teachers')
export class Teacher extends BaseEntity {
  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  employeeId!: string;

  @Column({ type: 'date', nullable: true })
  hireDate!: Date | null;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @OneToMany(() => TeacherAssignment, (assignment) => assignment.teacher)
  assignments!: TeacherAssignment[];

  fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
