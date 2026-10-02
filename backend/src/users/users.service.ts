import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { TenantCrudService } from '../common/crud/tenant-crud.service';
import { hashPassword } from '../common/security/password';
import { User } from './user.entity';

export type SafeUser = Omit<
  User,
  'passwordHash' | 'refreshToken' | 'resetPasswordToken'
>;

/** Roles that grant organization-wide authority and must not be self-assignable. */
const PRIVILEGED_ROLES = ['ADMIN', 'PRINCIPAL'];

@Injectable()
export class UsersService extends TenantCrudService<User> {
  constructor(@InjectRepository(User) repo: Repository<User>) {
    super(repo);
  }

  async listUsers(user: AuthenticatedUser): Promise<SafeUser[]> {
    const users = await super.findAll(user);
    return users.map((entity) => this.toSafeUser(entity));
  }

  async getUser(id: string, user: AuthenticatedUser): Promise<SafeUser> {
    const entity = await super.findOne(id, user);
    return this.toSafeUser(entity);
  }

  async createUser(
    payload: Partial<User> & { password?: string },
    user: AuthenticatedUser,
  ): Promise<SafeUser> {
    const { password, role, ...rest } = payload;
    const entity = this.repo.create({
      ...rest,
      role: this.resolveAssignableRole(role, user),
      organizationId: user.organizationId,
    });

    if (password) {
      entity.passwordHash = await hashPassword(password);
    }

    return this.toSafeUser(await this.repo.save(entity));
  }

  async updateUser(
    id: string,
    payload: Partial<User> & { password?: string },
    user: AuthenticatedUser,
  ): Promise<SafeUser> {
    const entity = await super.findOne(id, user);
    const { password, passwordHash: _ignored, refreshToken: _ignoredRefresh, role, ...rest } = payload;

    Object.assign(entity, rest, { organizationId: user.organizationId });

    if (role !== undefined) {
      entity.role = this.resolveAssignableRole(role, user);
    }

    if (password) {
      entity.passwordHash = await hashPassword(password);
      entity.refreshToken = null;
    }

    return this.toSafeUser(await this.repo.save(entity));
  }

  /**
   * Only an existing ADMIN may mint another ADMIN or PRINCIPAL, so a PRINCIPAL
   * cannot self-escalate by creating a peer admin account.
   */
  private resolveAssignableRole(
    requested: string | undefined,
    actor: AuthenticatedUser,
  ): string {
    if (!requested) {
      throw new BadRequestException('role is required when creating a user');
    }

    if (
      PRIVILEGED_ROLES.includes(requested) &&
      actor.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Only an ADMIN may assign the ADMIN or PRINCIPAL role',
      );
    }

    return requested;
  }

  private toSafeUser(entity: User): SafeUser {
    const {
      passwordHash: _passwordHash,
      refreshToken: _refreshToken,
      resetPasswordToken: _resetPasswordToken,
      ...safe
    } = entity;
    return safe;
  }
}