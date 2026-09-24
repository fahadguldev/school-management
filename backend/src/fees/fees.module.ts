import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/student.entity';
import { FeeStructure } from './fee-structure.entity';
import { Fee } from './fee.entity';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { Payment } from './payment.entity';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([FeeStructure, Fee, Payment, Student]), AuditModule],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [TypeOrmModule, FeesService],
})
export class FeesModule {}
