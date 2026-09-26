import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';
import { User } from '../users/user.entity';

@Entity('principal_alerts')
export class PrincipalAlert extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  alertType!: 'CLASS_PASS_DROP' | 'TEACHER_AVERAGE_DROP' | 'SECTION_ATTENDANCE_LOW' | 'FEE_COLLECTION_LOW';

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 255 })
  detailUrl!: string;

  @Column({ type: 'varchar', length: 255 })
  fingerprint!: string;

  @Column({ type: 'boolean', default: false })
  acknowledged!: boolean;

  @ManyToOne(() => User, { nullable: true })
  acknowledgedBy!: User | null;
}
