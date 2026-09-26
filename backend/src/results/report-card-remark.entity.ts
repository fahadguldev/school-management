import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { Term } from '../academic/term.entity';
import { BaseEntity } from '../common/database/base.entity';
import { Student } from '../students/student.entity';
import { User } from '../users/user.entity';

@Entity('report_card_remarks')
@Unique(['organizationId', 'student', 'term'])
export class ReportCardRemark extends BaseEntity {
  @ManyToOne(() => Student, { nullable: false })
  student!: Student;

  @ManyToOne(() => Term, { nullable: false })
  term!: Term;

  @Column({ type: 'text' })
  remarkText!: string;

  @ManyToOne(() => User, { nullable: false })
  enteredBy!: User;
}
