import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { MarksService } from './marks.service';

@Controller('marks')
export class MarksController {
  constructor(private readonly marks: MarksService) {}

  @Get('assessment/:assessmentId')
  findByAssessment(@Param('assessmentId') assessmentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.marks.findByAssessment(assessmentId, user);
  }

  @Roles('ADMIN', 'TEACHER')
  @Post()
  enterMark(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.marks.enterMark(body, user);
  }

  /**
   * Atomic Marks Import Endpoint:
   * Accepts EITHER a multipart Excel/CSV file upload (`file` field)
   * OR a JSON payload containing `{ rows: [...] }`.
   * Automatically validates all rows and executes within an atomic transaction.
   */
  @Roles('ADMIN', 'TEACHER')
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importMarks(
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @Body() body: { rows?: any[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (file && file.buffer) {
      return this.marks.importFile(file, user);
    }

    if (body?.rows && Array.isArray(body.rows) && body.rows.length > 0) {
      return this.marks.importMarks(body.rows, user);
    }

    throw new BadRequestException(
      'Invalid marks import payload. Provide an Excel/CSV file via multipart/form-data or a JSON body with "rows".',
    );
  }

  @Roles('ADMIN', 'TEACHER')
  @Post('import/upload')
  @UseInterceptors(FileInterceptor('file'))
  importMarksFile(
    @UploadedFile() file: { buffer: Buffer; originalname: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Expected a multipart field named "file".');
    }
    return this.marks.importFile(file, user);
  }

  @Roles('ADMIN', 'TEACHER')
  @Get('import/template')
  getImportTemplate() {
    return {
      columns: ['assessmentId', 'studentId', 'subjectId', 'obtainedMarks', 'isAbsent'],
      csvTemplate: this.marks.getTemplateCsv(),
      description:
        'Upload a .csv or .xlsx file with these columns. The import commits atomically and aborts if any row fails validation.',
    };
  }

  @Roles('ADMIN')
  @Post('assessment/:assessmentId/publish')
  publishAssessment(@Param('assessmentId') assessmentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.marks.publishAssessment(assessmentId, user);
  }
}
