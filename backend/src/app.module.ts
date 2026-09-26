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
import { getConfig } from './common/config/config.service';
import { TestController } from './test/test.controller';
const config = getConfig();

@Module({
  imports: [
    // Attempt Postgres, but fall back to an in-memory SQLite DB when Postgres is unavailable (development convenience)
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const { DataSource } = await import('typeorm');
        const pgOptions = {
          type: 'postgres' as const,
          host: config.database.host,
          port: config.database.port,
          username: config.database.username,
          password: config.database.password,
          database: config.database.name,
          entities: [`${__dirname}/**/*.entity{.ts,.js}`],
          synchronize: config.database.synchronize,
          logging: config.database.logging,
          // Allow SSL for cloud Postgres providers like Supabase. Reject unauthorized is false
          // so self-signed certs won't block local development. Adjust for production as needed.
          ssl: { rejectUnauthorized: false },
        };

        try {
          // Try initializing a transient DataSource to verify Postgres is reachable
          const ds = new DataSource(pgOptions as any);
          await ds.initialize();
          await ds.destroy();
          return pgOptions;
        } catch (err) {
          // If Postgres is not available, fall back to an in-memory sqlite DB to allow the app to start
          // This keeps behavior identical when a real DB is provided and doesn't add features beyond running.
          // Using synchronize: true for the fallback so entities are created automatically in-memory.
          // eslint-disable-next-line no-console
          console.warn('Postgres not reachable — falling back to in-memory SQLite for development.');
          return {
            type: 'sqlite' as const,
            database: ':memory:',
            entities: [`${__dirname}/**/*.entity{.ts,.js}`],
            synchronize: true,
            logging: false,
          };
        }
      },
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
