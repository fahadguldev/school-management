import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { ClassesModule } from './classes/classes.module';
import { SubjectsModule } from './subjects/subjects.module';
import { AcademicModule } from './academic/academic.module';
import { ExamsModule } from './exams/exams.module';
import { MarksModule } from './marks/marks.module';
import { ResultsModule } from './results/results.module';
import { FeesModule } from './fees/fees.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { OperationsModule } from './operations/operations.module';
import { resolveDatabaseOptions } from './database/database-options';
import { TestController } from './test/test.controller';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => resolveDatabaseOptions(),
    }),
    TenancyModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    ClassesModule,
    SubjectsModule,
    AcademicModule,
    ExamsModule,
    MarksModule,
    ResultsModule,
    FeesModule,
    AnalyticsModule,
    AuditModule,
    AttendanceModule,
    NotificationsModule,
    IntelligenceModule,
    OperationsModule,
  ],
  controllers: [TestController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
