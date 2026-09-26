import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { AuditModule } from '../audit/audit.module';
import { Class } from '../classes/class.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Organization } from '../organizations/organization.entity';
import { Student } from '../students/student.entity';
import { Teacher } from '../teachers/teacher.entity';
import { User } from '../users/user.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceCorrectionRequest } from './attendance-correction-request.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceSession } from './attendance-session.entity';
import { StaffAttendanceRecord } from './staff-attendance-record.entity';
import { StaffLeaveRequest } from './staff-leave-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceSession,
      AttendanceRecord,
      AttendanceCorrectionRequest,
      StaffAttendanceRecord,
      StaffLeaveRequest,
      StudentEnrollment,
      TeacherAssignment,
      Teacher,
      Student,
      Class,
      User,
      Organization,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService, TypeOrmModule],
})
export class AttendanceModule {}
