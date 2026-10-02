import { DataSource, type DataSourceOptions } from 'typeorm';
import { AppConfig, getConfig } from '../common/config/config.service';

const ENTITY_GLOB = `${__dirname}/../**/*.entity{.ts,.js}`;
const MIGRATION_GLOB = `${__dirname}/migrations/*.{ts,js}`;

export function buildPostgresOptions(config: AppConfig): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.name,
    entities: [ENTITY_GLOB],
    migrations: [MIGRATION_GLOB],
    synchronize: config.database.synchronize,
    migrationsRun: config.database.migrationsRun,
    logging: config.database.logging,
    connectTimeoutMS: config.database.connectTimeoutMs,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  };
}

export function buildSqliteFallbackOptions(): DataSourceOptions {
  return {
    type: 'sqlite',
    database: ':memory:',
    entities: [ENTITY_GLOB],
    // synchronize is safe here precisely because the database is discarded on
    // shutdown; the Postgres path above never gets this treatment.
    synchronize: true,
    migrationsRun: false,
    logging: false,
  };
}

function describeCause(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Resolves the connection options for the running app.
 *
 * Postgres is the only supported production database. An in-memory SQLite
 * database is available strictly as an opt-in development convenience
 * (ALLOW_SQLITE_FALLBACK=true, refused in production); when Postgres is
 * unreachable and the fallback is not enabled, this throws so the process dies
 * loudly instead of silently serving a database that forgets everything on exit.
 */
export async function resolveDatabaseOptions(): Promise<DataSourceOptions> {
  const config = getConfig();
  const postgresOptions = buildPostgresOptions(config);

  const probe = new DataSource(postgresOptions);
  try {
    await probe.initialize();
    await probe.destroy();
    return postgresOptions;
  } catch (error) {
    if (!config.database.allowSqliteFallback) {
      throw new Error(
        [
          `Cannot reach Postgres at ${config.database.host}:${config.database.port}/${config.database.name}: ${describeCause(error)}`,
          '',
          'Refusing to start. A production deployment must not run on a fallback database.',
          'Either fix the database connection, or set ALLOW_SQLITE_FALLBACK=true to boot',
          'on a throwaway in-memory SQLite database (development only; all data is lost',
              'when the process restarts).',
        ].join('\n'),
        { cause: error },
      );
    }

    console.warn(
      [
        '',
        '==============================================================================',
        ' !! DEVELOPMENT ONLY: USING A THROWAWAY IN-MEMORY SQLITE DATABASE        !!',
        '==============================================================================',
        ` Postgres was unreachable: ${describeCause(error)}`,
        '',
        ' Everything you create now lives in RAM and is DESTROYED when this process',
        ' stops. Do not enter real student, parent or staff data into this mode.',
        '',
        ' To run against a real database, fix DB_HOST / DB_PORT / DB_USERNAME /',
        ' DB_PASSWORD / DB_NAME and restart.',
        '==============================================================================',
        '',
      ].join('\n'),
    );

    return buildSqliteFallbackOptions();
  }
}