import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { Student } from './student.entity';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Roles('ADMIN', 'PRINCIPAL', 'INCHARGE', 'TEACHER')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('classId') classId?: string,
    @Query('section') section?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.students.findAll(user, { classId, section, isActive, search });
  }

  @Roles('ADMIN', 'PRINCIPAL', 'INCHARGE', 'TEACHER')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.students.findOne(id, user);
  }

  @Roles('ADMIN', 'PRINCIPAL', 'INCHARGE', 'TEACHER')
  @Get(':id/history')
  history(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.students.history(id, user);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: Partial<Student>, @CurrentUser() user: AuthenticatedUser) {
    return this.students.create(body, user);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Student>, @CurrentUser() user: AuthenticatedUser) {
    return this.students.update(id, body, user);
  }

  @Roles('ADMIN')
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.students.deactivate(id, user);
  }

  @Roles('ADMIN')
  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.students.activate(id, user);
  }
}
