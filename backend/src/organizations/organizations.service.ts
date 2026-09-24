import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { Organization } from './organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
  ) {}

  async getCurrent(user: AuthenticatedUser): Promise<Organization> {
    const org = await this.repo.findOne({
      where: { id: user.organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateCurrent(user: AuthenticatedUser, payload: DeepPartial<Organization>): Promise<Organization> {
    const org = await this.getCurrent(user);
    Object.assign(org, payload);
    return this.repo.save(org);
  }
}
