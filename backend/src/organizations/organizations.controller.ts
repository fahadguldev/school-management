import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { Roles } from '../common/auth/roles.decorator';
import { OrganizationsService } from './organizations.service';
import { Organization } from './organization.entity';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.getCurrent(user);
  }

  @Roles('ADMIN', 'PRINCIPAL')
  @Patch('current')
  updateCurrent(@CurrentUser() user: AuthenticatedUser, @Body() body: Partial<Organization>) {
    return this.organizations.updateCurrent(user, body);
  }
}
