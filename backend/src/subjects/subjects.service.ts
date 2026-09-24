import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantCrudService } from '../common/crud/tenant-crud.service';
import { Subject } from './subject.entity';

@Injectable()
export class SubjectsService extends TenantCrudService<Subject> {
  constructor(@InjectRepository(Subject) repo: Repository<Subject>) {
    super(repo);
  }
}
