import { Controller, Get, Post } from '@nestjs/common';
import { RlsService } from './rls.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';

@Controller('tenancy')
export class TenancyController {
  constructor(private readonly rlsService: RlsService) {}

  /**
   * Diagnostic probe for PostgreSQL Row-Level Security (RLS) & Multi-Tenant Isolation.
   * Returns live status of all 17 protected tables and active policies.
   */
  @Public()
  @Get('rls-status')
  async getRlsStatus(@CurrentUser() user?: AuthenticatedUser) {
    return this.rlsService.getRlsStatus(user?.organizationId);
  }

  /**
   * Verifies tenant isolation proof showing cross-tenant reads and mutations are barred.
   */
  @Public()
  @Get('verify-isolation')
  async verifyIsolation(@CurrentUser() user?: AuthenticatedUser) {
    return this.rlsService.verifyIsolationProof(user?.organizationId);
  }

  /**
   * Applies or refreshes PostgreSQL RLS policies on all tables.
   */
  @Post('rls/apply')
  @Roles('ADMIN')
  async applyRls() {
    return this.rlsService.applyRlsPolicies();
  }
}
