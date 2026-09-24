import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { AcademicYear } from './academic-year.entity';
import { AcademicService } from './academic.service';
import { StudentEnrollment } from './student-enrollment.entity';
import { TeacherAssignment } from './teacher-assignment.entity';
import { Term } from './term.entity';

@Controller('academic')
export class AcademicController {
  constructor(private readonly academic: AcademicService) {}

  @Get('years')
  findAcademicYears(@CurrentUser() user: AuthenticatedUser) {
    return this.academic.findAcademicYears(user);
  }

  @Roles('ADMIN')
  @Post('years')
  createAcademicYear(@Body() body: Partial<AcademicYear>, @CurrentUser() user: AuthenticatedUser) {
    return this.academic.createAcademicYear(body, user);
  }

  @Get('terms')
  findTerms(@CurrentUser() user: AuthenticatedUser) {
    return this.academic.findTerms(user);
  }

  @Roles('ADMIN')
  @Post('terms')
  createTerm(@Body() body: Partial<Term> & { academicYearId?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.academic.createTerm(body, user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'INCHARGE')
  @Get('enrollments')
  findEnrollments(@CurrentUser() user: AuthenticatedUser) {
    return this.academic.findEnrollments(user);
  }

  @Roles('ADMIN')
  @Post('enrollments')
  createEnrollment(
    @Body() body: Partial<StudentEnrollment> & { studentId: string; classId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academic.createEnrollment(body, user);
  }

  @Roles('ADMIN', 'PRINCIPAL')
  @Get('teacher-assignments')
  findTeacherAssignments(@CurrentUser() user: AuthenticatedUser) {
    return this.academic.findTeacherAssignments(user);
  }

  @Roles('ADMIN')
  @Post('teacher-assignments')
  createTeacherAssignment(
    @Body() body: Partial<TeacherAssignment> & { teacherId: string; classId: string; subjectId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.academic.createTeacherAssignment(body, user);
  }
}
