import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { Assessment } from './assessment.entity';
import { ExamsService } from './exams.service';

@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.exams.findAll(user);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: Partial<Assessment>, @CurrentUser() user: AuthenticatedUser) {
    return this.exams.create(body, user);
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exams.updateStatus(id, body.status, user);
  }
}
