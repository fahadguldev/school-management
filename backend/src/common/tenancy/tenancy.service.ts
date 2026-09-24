import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  organizationId: string;
  userId: string;
  role: string;
}

@Injectable()
export class TenancyService {
  private static readonly storage = new AsyncLocalStorage<TenantContext>();

  static runWithContext<T>(ctx: TenantContext, callback: () => T): T {
    return this.storage.run(ctx, callback);
  }

  static getContext(): TenantContext {
    const context = this.storage.getStore();

    if (!context) {
      throw new UnauthorizedException('Tenant context not found');
    }

    return context;
  }

  static hasContext(): boolean {
    return this.storage.getStore() !== undefined;
  }
}
