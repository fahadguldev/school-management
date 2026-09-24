import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { Subject } from './subject.entity';
import { SubjectsService } from './subjects.service';

@Roles('ADMIN', 'PRINCIPAL', 'TEACHER', 'INCHARGE')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.subjects.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.subjects.findOne(id, user);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: Partial<Subject>, @CurrentUser() user: AuthenticatedUser) {
    return this.subjects.create(body, user);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Subject>, @CurrentUser() user: AuthenticatedUser) {
    return this.subjects.update(id, body, user);
  }
}
