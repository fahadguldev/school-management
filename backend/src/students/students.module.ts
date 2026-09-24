import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentEnrollment } from '../academic/student-enrollment.entity';
import { TeacherAssignment } from '../academic/teacher-assignment.entity';
import { Result } from '../results/result.entity';
import { Teacher } from '../teachers/teacher.entity';
import { Student } from './student.entity';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [TypeOrmModule.forFeature([Student, StudentEnrollment, TeacherAssignment, Teacher, Result])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [TypeOrmModule, StudentsService],
})
export class StudentsModule {}
