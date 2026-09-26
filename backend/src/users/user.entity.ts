import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { createHash, timingSafeEqual } from 'crypto';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email!: string;

  @Column()
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

  // Use 'datetime' which is supported by sqlite. For Postgres the driver will accept JS Date values as well.
  @Column({ type: 'datetime', nullable: true })
  resetPasswordExpires!: Date | null;

  setPassword(password: string): void {
    this.passwordHash = createHash('sha256').update(password).digest('hex');
  }

  validatePassword(password: string): boolean {
    const candidate = createHash('sha256').update(password).digest('hex');
    if (candidate.length !== this.passwordHash.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(candidate), Buffer.from(this.passwordHash));
  }
}
