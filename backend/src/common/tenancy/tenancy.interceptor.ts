import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenancyService } from './tenancy.service';

@Injectable()
export class TenancyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;

    if (!user) {
      return next.handle();
    }

    return TenancyService.runWithContext(
      {
        organizationId: user.organizationId,
        userId: user.id,
        role: user.role,
      },
      () => next.handle(),
    );
  }
}
