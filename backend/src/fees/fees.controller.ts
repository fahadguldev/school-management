import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  @Roles('ADMIN')
  @Post('structures')
  createStructure(@Body() body: Partial<FeeStructure>, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.createStructure(body, user);
  }

  /**
   * Student Personal Fee Portal:
   * Returns current dues, payment receipts, and fee history scoped strictly to the student.
   */
  @Roles('STUDENT', 'ADMIN', 'PRINCIPAL')
  @Get('my-dues')
  myDues(@CurrentUser() user: AuthenticatedUser) {
    return this.fees.getStudentFees(user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'TEACHER')
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

  @Roles('ADMIN')
  @Post()
  createFee(@Body() body: Partial<Fee> & { studentId: string; feeStructureId: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.createFee(body, user);
  }

  @Roles('ADMIN')
  @Post(':id/pay')
  markPaid(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.markPaid(id, body, user);
  }

  @Roles('ADMIN')
  @Post(':id/unpay')
  markUnpaid(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.markUnpaid(id, user);
  }

  @Get(':id/payments')
  paymentHistory(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fees.paymentHistory(id, user);
  }
}
