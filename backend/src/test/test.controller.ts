import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';

@Controller()
export class TestController {
  @Public()
  @Get()
  root() {
    return { status: 'ok', message: 'Backend is running' };
  }

  @Public()
  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
