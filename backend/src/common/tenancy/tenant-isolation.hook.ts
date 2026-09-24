import { DataSource } from 'typeorm';
import { TenancyService } from './tenancy.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('TenantIsolationHook');

/**
 * Attaches PostgreSQL Row-Level Security (RLS) session variable enforcement
 * to TypeORM's DataSource query runner lifecycle.
 *
 * For every query executed within a request, this ensures:
 * 1. `app.current_organization_id` is set to the authenticated tenant's ID
 * 2. On release back to the connection pool, the session variable is sanitized
 */
export function attachTenantIsolationHook(dataSource: DataSource): void {
  if (!dataSource || (dataSource.options.type as string) !== 'postgres') {
    logger.log(`Database driver is '${dataSource?.options?.type}'. PostgreSQL RLS hook inactive (emulated mode).`);
    return;
  }

  const originalCreateQueryRunner = dataSource.createQueryRunner.bind(dataSource);

  dataSource.createQueryRunner = function (mode) {
    const runner = originalCreateQueryRunner(mode);
    const originalQuery = runner.query.bind(runner);
    const originalRelease = runner.release.bind(runner);

    let sessionSet = false;

runner.query = async function (query: string, parameters?: any[], useConsole?: boolean) {
      // If we have an active tenant context and haven't set it on this connection yet
      if (!sessionSet && TenancyService.hasContext()) {
        try {
          const ctx = TenancyService.getContext();
          if (ctx?.organizationId) {
            // Set session variable for current connection in pool
            await originalQuery(`SELECT set_config('app.current_organization_id', $1, false);`, [ctx.organizationId]);
            sessionSet = true;
          }
        } catch (err: any) {
          logger.debug(`Could not set app.current_organization_id: ${err.message}`);
        }
      }

      return originalQuery(query, parameters, useConsole as true);
    };

    runner.release = async function () {
      if (sessionSet && !runner.isReleased) {
        try {
          // Clear tenant context before returning connection to pool
          await originalQuery(`SELECT set_config('app.current_organization_id', '', false);`);
        } catch {
          // Ignore connection cleanup errors
        }
      }
      return originalRelease();
    };

    return runner;
  };

  logger.log('PostgreSQL Row-Level Security (RLS) QueryRunner hook successfully attached.');
}
