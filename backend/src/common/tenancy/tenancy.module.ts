import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenancyInterceptor } from './tenancy.interceptor';
import { TenancyService } from './tenancy.service';
import { RlsService } from './rls.service';
import { TenancyController } from './tenancy.controller';

@Module({
  controllers: [TenancyController],
  providers: [
    TenancyService,
    RlsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenancyInterceptor,
    },
  ],
  exports: [TenancyService, RlsService],
})
export class TenancyModule {}
