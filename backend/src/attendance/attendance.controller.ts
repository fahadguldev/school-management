import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { AttendanceService } from './attendance.service';
import { AttendanceStatus } from './attendance-record.entity';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Roles('ADMIN', 'TEACHER', 'INCHARGE')
  @Post('sessions')
  createSession(@Body() body: { classId: string; date?: string; period?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.createSession(body, user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'TEACHER', 'INCHARGE')
  @Get('sessions/:id')
  getSession(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.getSession(id, user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'TEACHER', 'INCHARGE')
  @Get('daily')
  daily(@Query('date') date: string | undefined, @Query('classId') classId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.dailyClassView(date, classId, user);
  }

  @Roles('ADMIN', 'TEACHER', 'INCHARGE')
  @Patch('sessions/:id/records')
  mark(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.mark(id, body, user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'TEACHER', 'INCHARGE')
  @Get('students/:studentId/history')
  studentHistory(@Param('studentId') studentId: string, @Query('from') from: string | undefined, @Query('to') to: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.studentHistory(studentId, user, from, to);
  }

  @Roles('TEACHER', 'INCHARGE')
  @Post('records/:recordId/corrections')
  requestCorrection(@Param('recordId') recordId: string, @Body() body: { requestedStatus: AttendanceStatus; reason: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.requestCorrection(recordId, body, user);
  }

  @Roles('ADMIN', 'INCHARGE')
  @Get('corrections')
  corrections(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: any) {
    return this.attendance.listCorrections(user, status);
  }

  @Roles('ADMIN', 'INCHARGE')
  @Patch('corrections/:id')
  reviewCorrection(@Param('id') id: string, @Body() body: { status: 'APPROVED' | 'REJECTED'; reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.reviewCorrection(id, body, user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'TEACHER', 'INCHARGE', 'ACCOUNTANT')
  @Post('staff')
  markStaff(@Body() body: { staffId: string; date?: string; status: AttendanceStatus }, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.markStaff(body, user);
  }

  @Roles('ADMIN', 'PRINCIPAL')
  @Get('staff/summary')
  staffSummary(@CurrentUser() user: AuthenticatedUser, @Query('month') month?: string) {
    return this.attendance.staffSummary(user, month);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'TEACHER', 'INCHARGE', 'ACCOUNTANT')
  @Post('staff/leave-requests')
  requestLeave(@Body() body: { startDate: string; endDate: string; reason: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.requestLeave(body, user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'TEACHER', 'INCHARGE', 'ACCOUNTANT')
  @Get('staff/leave-requests')
  leaveRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.attendance.listLeaveRequests(user);
  }

  @Roles('ADMIN', 'PRINCIPAL')
  @Patch('staff/leave-requests/:id')
  reviewLeave(@Param('id') id: string, @Body('status') status: 'APPROVED' | 'REJECTED', @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.reviewLeave(id, status, user);
  }
}
