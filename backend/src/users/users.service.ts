import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { TenantCrudService } from '../common/crud/tenant-crud.service';
import { User } from './user.entity';

@Injectable()
export class UsersService extends TenantCrudService<User> {
  constructor(@InjectRepository(User) repo: Repository<User>) {
    super(repo);
  }

  createUser(payload: Partial<User> & { password?: string }, user: AuthenticatedUser) {
    const entity = this.repo.create({
      ...payload,
      organizationId: user.organizationId,
    });

    if (payload.password) {
      entity.setPassword(payload.password);
    }

    return this.repo.save(entity);
  }
}
