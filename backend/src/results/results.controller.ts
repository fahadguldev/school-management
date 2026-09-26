import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../common/auth/roles.decorator';
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

  @Roles('ADMIN', 'TEACHER', 'INCHARGE')
  @Post('student/:studentId/remarks')
  saveRemark(@Param('studentId') studentId: string, @Body() body: { termId: string; remarkText: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.results.saveRemark(studentId, body.termId, body.remarkText, user);
  }

  @Get('student/:studentId/report-card.pdf')
  async reportCardPdf(@Param('studentId') studentId: string, @Query('termId') termId: string | undefined, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const pdf = await this.results.reportCardPdf(studentId, user.organizationId, termId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="report-card-${studentId}.pdf"`);
    response.send(pdf);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'INCHARGE')
  @Get('class/:classId/report-cards.pdf')
  async bulkReportCards(@Param('classId') classId: string, @Query('termId') termId: string | undefined, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const pdf = await this.results.bulkReportCardPdf(classId, user.organizationId, termId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="report-cards-${classId}.pdf"`);
    response.send(pdf);
  }
}
