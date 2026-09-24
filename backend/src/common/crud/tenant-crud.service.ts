import { NotFoundException } from '@nestjs/common';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { BaseEntity } from '../database/base.entity';
import { AuthenticatedUser } from '../auth/authenticated-user';

export class TenantCrudService<T extends BaseEntity> {
  constructor(protected readonly repo: Repository<T>) {}

  findAll(user: AuthenticatedUser): Promise<T[]> {
    return this.repo.find({
      where: { organizationId: user.organizationId } as FindOptionsWhere<T>,
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<T> {
    const entity = await this.repo.findOne({
      where: { id, organizationId: user.organizationId } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new NotFoundException('Resource not found');
    }

    return entity;
  }

  create(payload: DeepPartial<T>, user: AuthenticatedUser): Promise<T> {
    const entity = this.repo.create({
      ...payload,
      organizationId: user.organizationId,
    });

    return this.repo.save(entity);
  }

  async update(id: string, payload: DeepPartial<T>, user: AuthenticatedUser): Promise<T> {
    const entity = await this.findOne(id, user);
    Object.assign(entity, payload, { organizationId: user.organizationId });
    return this.repo.save(entity);
  }

  async deactivate(id: string, user: AuthenticatedUser): Promise<T> {
    const entity = await this.findOne(id, user);
    entity.isActive = false;
    return this.repo.save(entity);
  }
}
