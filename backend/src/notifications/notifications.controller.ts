import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { NotificationTrigger } from './notification-log.entity';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Roles('ADMIN', 'PRINCIPAL', 'ACCOUNTANT')
  @Get('logs')
  logs(@CurrentUser() user: AuthenticatedUser, @Query('triggerType') triggerType?: NotificationTrigger) {
    return this.notifications.findLogs(user, triggerType);
  }

  @Roles('ADMIN')
  @Get('students/:studentId/contacts')
  contacts(@Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.findContacts(studentId, user);
  }

  @Roles('ADMIN')
  @Post('students/:studentId/contacts')
  addContact(
    @Param('studentId') studentId: string,
    @Body() body: { phoneNumber: string; isPrimary?: boolean },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.addContact(studentId, body, user);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post(':id/retry')
  retry(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.retry(id, user);
  }
}
