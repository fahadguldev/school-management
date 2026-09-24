import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { Class } from './class.entity';
import { ClassesService } from './classes.service';

@Roles('ADMIN', 'PRINCIPAL', 'INCHARGE', 'TEACHER')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('name') name?: string,
    @Query('section') section?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    if (name || section || academicYear) {
      return this.classes.findAllClasses(user, { name, section, academicYear });
    }
    return this.classes.findAll(user);
  }

  @Get('sections')
  findSections(@CurrentUser() user: AuthenticatedUser) {
    return this.classes.findSections(user);
  }

  @Get(':id/sections')
  getSectionsForClass(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.classes.getSectionsForClass(id, user);
  }

  @Get(':id/roster')
  getClassRoster(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.classes.getClassRoster(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.classes.findOne(id, user);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() body: Partial<Class>, @CurrentUser() user: AuthenticatedUser) {
    return this.classes.create(body, user);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Class>, @CurrentUser() user: AuthenticatedUser) {
    return this.classes.update(id, body, user);
  }
}
