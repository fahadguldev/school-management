import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string; // STUDENT, TEACHER, INCHARGE, ADMIN, PRINCIPAL, ACCOUNTANT

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'integer', default: 0 })
  permissionBits!: number; // bitmask for permissions
}
