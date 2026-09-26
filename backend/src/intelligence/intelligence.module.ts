import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { AttendanceRecord } from '../attendance/attendance-record.entity';
import { StaffAttendanceRecord } from '../attendance/staff-attendance-record.entity';
import { Class } from '../classes/class.entity';
import { Fee } from '../fees/fee.entity';
import { Payment } from '../fees/payment.entity';
import { Organization } from '../organizations/organization.entity';
import { Result } from '../results/result.entity';
import { Teacher } from '../teachers/teacher.entity';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { PrincipalAlert } from './principal-alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Result, Class, Teacher, TeacherAssignment,
    AttendanceRecord, StaffAttendanceRecord, Fee, Payment, Organization, PrincipalAlert,
  ])],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
