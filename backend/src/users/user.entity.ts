import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: string; // STUDENT, TEACHER, INCHARGE, ADMIN, PRINCIPAL, ACCOUNTANT

  @Column({ type: 'boolean', default: true })
  isEmailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshToken!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resetPasswordToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires!: Date | null;
}
