import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assessment } from '../exams/assessment.entity';
import { Mark } from '../marks/mark.entity';
import { Student } from '../students/student.entity';
import { Result } from './result.entity';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

@Module({
  imports: [TypeOrmModule.forFeature([Result, Mark, Assessment, Student])],
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [TypeOrmModule, ResultsService],
})
export class ResultsModule {}
