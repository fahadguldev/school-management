import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { Assessment } from '../exams/assessment.entity';
import { ResultsModule } from '../results/results.module';
import { Student } from '../students/student.entity';
import { Subject } from '../subjects/subject.entity';
import { Teacher } from '../teachers/teacher.entity';
import { Mark } from './mark.entity';
import { MarksController } from './marks.controller';
import { MarksService } from './marks.service';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mark, Assessment, Student, Subject, Teacher, TeacherAssignment]),
    ResultsModule,
    AuditModule,
  ],
  controllers: [MarksController],
  providers: [MarksService],
})
export class MarksModule {}
