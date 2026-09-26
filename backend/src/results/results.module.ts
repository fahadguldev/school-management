import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from '../exams/assessment.entity';
import { Mark } from '../marks/mark.entity';
import { Student } from '../students/student.entity';
import { Result } from './result.entity';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { AttendanceRecord } from '../attendance/attendance-record.entity';
import { Organization } from '../organizations/organization.entity';
import { ReportCardRemark } from './report-card-remark.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Result, Mark, Assessment, Student, AttendanceRecord, Organization, ReportCardRemark])],
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [TypeOrmModule, ResultsService],
})
export class ResultsModule {}
