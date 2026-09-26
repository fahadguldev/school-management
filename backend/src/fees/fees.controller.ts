import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { FeeStructure } from './fee-structure.entity';
import { Fee } from './fee.entity';
import { FeesService } from './fees.service';

@Controller('fees')
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get('structures')
  findStructures(@CurrentUser() user: AuthenticatedUser) {
    return this.fees.findStructures(user);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post('structures')
  createStructure(@Body() body: Partial<FeeStructure>, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.createStructure(body, user);
  }

  /**
   * Student Personal Fee Portal:
   * Returns current dues, payment receipts, and fee history scoped strictly to the student.
   */
  @Roles('STUDENT', 'ADMIN', 'PRINCIPAL', 'ACCOUNTANT')
  @Get('my-dues')
  myDues(@CurrentUser() user: AuthenticatedUser) {
    return this.fees.getStudentFees(user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT')
  @Get('student/:studentId')
  studentFees(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.getStudentFees(user, studentId);
  }

  @Get()
  findFees(@CurrentUser() user: AuthenticatedUser) {
    return this.fees.findFees(user);
  }

  /**
   * Official Fee Challan Generation:
   * Generates formal three-copy voucher (Bank, School, Student) with unique challan code.
   */
  @Get(':id/challan')
  generateChallan(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.generateChallan(id, user);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post()
  createFee(@Body() body: Partial<Fee> & { studentId: string; feeStructureId: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.createFee(body, user);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post(':id/pay')
  markPaid(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.markPaid(id, body, user);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post(':id/unpay')
  markUnpaid(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.markUnpaid(id, user);
  }

  @Get(':id/payments')
  paymentHistory(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.paymentHistory(id, user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'ACCOUNTANT')
  @Get('reports/defaulters')
  defaulters(@CurrentUser() user: AuthenticatedUser, @Query('classId') classId?: string, @Query('section') section?: string) {
    return this.fees.defaulters(user, classId, section);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'ACCOUNTANT')
  @Get('reports/collections')
  collections(@CurrentUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.fees.collectionReport(user, from, to);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post('bulk')
  bulk(@Body() body: { classId: string; feeStructureId: string; amount?: number; dueDate: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.bulkCreate(body, user);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post('due-reminders')
  reminders(@Body('withinDays') withinDays: number | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.sendDueReminders(user, withinDays);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post(':id/fine')
  fine(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.setFine(id, body, user);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post('discounts/sibling')
  discount(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.createSiblingDiscount(body, user);
  }
}
