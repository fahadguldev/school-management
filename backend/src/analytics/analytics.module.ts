import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from '../exams/assessment.entity';
import { Fee } from '../fees/fee.entity';
import { Result } from '../results/result.entity';
import { Student } from '../students/student.entity';
import { Class } from '../classes/class.entity';
import { Teacher } from '../teachers/teacher.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      Result,
      Assessment,
      Fee,
      Class,
      Teacher,
      TeacherAssignment,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
