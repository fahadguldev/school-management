import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { Roles } from '../common/auth/roles.decorator';
import { AuditService } from './audit.service';

@Roles('ADMIN', 'PRINCIPAL')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Retrieves audit logs for the organization.
   * Tracks who changed what, sensitive actions, old vs new values, and timestamps.
   */
  @Get()
  getLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findLogs(user, {
      action,
      resource,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
