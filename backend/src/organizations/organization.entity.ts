import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/database/base.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column()
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  academicYear!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'Term 1' })
  currentTerm!: string;

  @Column({ type: 'boolean', default: true })
  status!: boolean;
}
