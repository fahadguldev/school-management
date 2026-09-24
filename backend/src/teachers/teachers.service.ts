import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantCrudService } from '../common/crud/tenant-crud.service';
import { Teacher } from './teacher.entity';

@Injectable()
export class TeachersService extends TenantCrudService<Teacher> {
  constructor(@InjectRepository(Teacher) repo: Repository<Teacher>) {
    super(repo);
  }
}
