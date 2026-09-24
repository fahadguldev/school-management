import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { User } from '../users/user.entity';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { Mark } from '../marks/mark.entity';
import { Result } from '../results/result.entity';
import { Fee } from '../fees/fee.entity';

@Entity('students')
export class Student extends BaseEntity {
  @Column()
  admissionNumber!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fatherGuardianName!: string | null;

  @Column()
  dateOfBirth!: Date;

  @Column()
  gender!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  contactInformation!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  className!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  section!: string | null;

  @Column({ type: 'date', nullable: true })
  admissionDate!: Date | null;

  @Column({ type: 'boolean', default: true })
  status!: boolean;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user?: User;

  @OneToMany(() => StudentEnrollment, (enrollment) => enrollment.student)
  enrollments!: StudentEnrollment[];

  @OneToMany(() => Mark, (mark) => mark.student)
  marks!: Mark[];

  @OneToMany(() => Result, (result) => result.student)
  results!: Result[];

  @OneToMany(() => Fee, (fee) => fee.student)
  fees!: Fee[];

  get fullName(): string {
    return this.name;
  }
}
