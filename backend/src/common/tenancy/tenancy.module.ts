import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenancyInterceptor } from './tenancy.interceptor';
import { RlsService } from './rls.service';
import { TenancyController } from './tenancy.controller';

@Module({
  controllers: [TenancyController],
  providers: [
    RlsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenancyInterceptor,
    },
  ],
  exports: [RlsService],
})
export class TenancyModule {}
