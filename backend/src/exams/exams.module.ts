import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsModule } from '../results/results.module';
import { Assessment } from './assessment.entity';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

@Module({
  imports: [TypeOrmModule.forFeature([Assessment]), ResultsModule],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
