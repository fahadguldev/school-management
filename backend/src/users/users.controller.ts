import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Roles('ADMIN', 'PRINCIPAL')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.users.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.users.findOne(id, user);
  }

  @Post()
  create(
    @Body() body: Partial<User> & { password?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.users.createUser(body, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<User> & { password?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.users.update(id, body, user);
  }
}
