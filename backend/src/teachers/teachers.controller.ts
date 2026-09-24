import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { Teacher } from './teacher.entity';
import { TeachersService } from './teachers.service';

@Roles('ADMIN', 'PRINCIPAL')
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.teachers.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teachers.findOne(id, user);
  }

  @Post()
  create(@Body() body: Partial<Teacher>, @CurrentUser() user: AuthenticatedUser) {
    return this.teachers.create(body, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Teacher>, @CurrentUser() user: AuthenticatedUser) {
    return this.teachers.update(id, body, user);
  }
}
