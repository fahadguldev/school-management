import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { IntelligenceService } from './intelligence.service';

@Roles('ADMIN', 'PRINCIPAL')
@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceService) {}

  @Get('threshold')
  threshold(@Query('metric') metric: any, @Query('value') value: string, @CurrentUser() user: AuthenticatedUser) {
    return this.intelligence.threshold(metric || 'passRate', Number(value || 70), user);
  }

  @Get('teachers/leaderboard')
  leaderboard(@CurrentUser() user: AuthenticatedUser, @Query('subjectId') subjectId?: string, @Query('className') className?: string) {
    return this.intelligence.teacherLeaderboard(user, subjectId, className);
  }

  @Get('teachers/grading-patterns') grading(@CurrentUser() user: AuthenticatedUser) { return this.intelligence.gradingPatterns(user); }
  @Get('teachers/:id') teacher(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.intelligence.teacherDeepDive(id, user); }
  @Get('section-gaps') gaps(@CurrentUser() user: AuthenticatedUser, @Query('minimumGap') gap?: string) { return this.intelligence.sectionGaps(user, Number(gap || 10)); }
  @Get('weak-subjects') subjects(@CurrentUser() user: AuthenticatedUser) { return this.intelligence.weakSubjects(user); }
  @Get('risk/students') riskStudents(@CurrentUser() user: AuthenticatedUser) { return this.intelligence.atRiskStudents(user); }
  @Get('risk/fee-defaults') feeRisk(@CurrentUser() user: AuthenticatedUser) { return this.intelligence.feeDefaultRisk(user); }
  @Get('trends/school') trends(@CurrentUser() user: AuthenticatedUser) { return this.intelligence.trends(user); }
  @Get('trends/year-over-year') yoy(@CurrentUser() user: AuthenticatedUser, @Query('termName') termName?: string) { return this.intelligence.yearOverYear(user, termName); }
  @Get('dashboard') dashboard(@CurrentUser() user: AuthenticatedUser) { return this.intelligence.operationalDashboard(user); }
  @Get('alerts') alerts(@CurrentUser() user: AuthenticatedUser) { return this.intelligence.listAlerts(user); }
  @Post('alerts/evaluate') evaluate(@CurrentUser() user: AuthenticatedUser) { return this.intelligence.generateAlerts(user); }
  @Patch('alerts/:id/acknowledge') acknowledge(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.intelligence.acknowledgeAlert(id, user); }
}
