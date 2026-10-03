import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from './academic-year.entity';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import { StudentEnrollment } from './student-enrollment.entity';
import { TeacherAssignment } from './teacher-assignment.entity';
import { Term } from './term.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear, StudentEnrollment, TeacherAssignment, Term])],
  controllers: [AcademicController],
  providers: [AcademicService],
})
export class AcademicModule {}
