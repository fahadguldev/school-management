import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { OperationsService } from './operations.service';

@Roles('ADMIN')
@Controller('operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('imports/:kind/template')
  template(@Param('kind') kind: 'students' | 'fee-structures') { return this.operations.template(kind); }

  @Post('imports/:kind')
  @UseInterceptors(FileInterceptor('file'))
  import(
    @Param('kind') kind: 'students' | 'fee-structures',
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @Body() body: { rows?: Record<string, any>[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!['students', 'fee-structures'].includes(kind)) throw new BadRequestException('Unsupported import kind');
    const rows = file ? this.operations.parseFile(file) : body.rows;
    if (!rows) throw new BadRequestException('Provide a CSV/XLSX file or rows array');
    return this.operations.import(kind, rows, user);
  }

  @Post('promotions')
  promote(@Body() body: any, @CurrentUser() user: AuthenticatedUser) { return this.operations.promote(body, user); }
}
