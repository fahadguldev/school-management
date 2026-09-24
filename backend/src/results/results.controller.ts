import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { ResultsService } from './results.service';

@Controller('results')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get('assessment/:assessmentId')
  findByAssessment(@Param('assessmentId') assessmentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.results.findByAssessment(assessmentId, user.organizationId);
  }

  /**
   * Overall Multi-Subject Report Card Summary
   * Aggregates subject scores, composite percentage, overall grade, and pass/fail status.
   */
  @Get('student/:studentId/summary')
  getStudentSummary(
    @Param('studentId') studentId: string,
    @Query('termId') termId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.results.getStudentReportCardSummary(studentId, user.organizationId, termId);
  }

  @Get('student/:studentId/report-card')
  getStudentReportCard(
    @Param('studentId') studentId: string,
    @Query('termId') termId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.results.getStudentReportCardSummary(studentId, user.organizationId, termId);
  }
}
