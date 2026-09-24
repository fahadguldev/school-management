import { Controller, Get, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Roles('ADMIN', 'PRINCIPAL', 'INCHARGE', 'TEACHER')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('school-overview')
  schoolOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.schoolOverview(user);
  }

  @Get('student-performance')
  studentPerformance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('strongThreshold') strongThreshold?: string,
    @Query('weakThreshold') weakThreshold?: string,
    @Query('evaluatorRole') evaluatorRole?: string,
    @Query('classId') classId?: string,
    @Query('section') section?: string,
  ) {
    return this.analytics.studentPerformance(user, {
      evaluatorRole,
      strongThreshold: strongThreshold ? Number(strongThreshold) : undefined,
      weakThreshold: weakThreshold ? Number(weakThreshold) : undefined,
      classId,
      section,
    });
  }

  @Roles('ADMIN', 'PRINCIPAL')
  @Get('principal/class-comparison')
  principalClassComparison(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.principalClassComparison(user);
  }

  @Roles('ADMIN', 'PRINCIPAL')
  @Get('principal/teacher-performance')
  principalTeacherPerformance(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.principalTeacherPerformance(user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'INCHARGE')
  @Get('incharge/class-overview')
  inchargeClassOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('classId') classId?: string,
  ) {
    return this.analytics.inchargeClassOverview(user, classId);
  }
}
