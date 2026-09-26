import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/student.entity';
import { FeeStructure } from './fee-structure.entity';
import { Fee } from './fee.entity';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { Payment } from './payment.entity';

import { AuditModule } from '../audit/audit.module';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { FeeFine } from './fee-fine.entity';
import { SiblingDiscount } from './sibling-discount.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeeStructure, Fee, Payment, FeeFine, SiblingDiscount, Student, StudentEnrollment]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [TypeOrmModule, FeesService],
})
export class FeesModule {}
