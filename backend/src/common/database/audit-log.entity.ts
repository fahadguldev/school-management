import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from '../../users/user.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @Column()
  action!: string; // e.g., 'CREATE_STUDENT', 'CHANGE_FEE', 'ENTER_MARKS', 'PUBLISH_RESULT'

  @Column()
  resource!: string; // e.g., 'student', 'fee', 'mark', 'result'

  @Column({ type: 'json', nullable: true })
  oldValue!: any | null;

  @Column({ type: 'json', nullable: true })
  newValue!: any | null;

  @Column({ type: 'varchar', length: 100 })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent!: string | null;
}
