import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { AuditModule } from '../audit/audit.module';
import { Class } from '../classes/class.entity';
import { FeeStructure } from '../fees/fee-structure.entity';
import { GuardianContact } from '../notifications/guardian-contact.entity';
import { Student } from '../students/student.entity';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudentEnrollment, Class, Student, GuardianContact, FeeStructure]), AuditModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
