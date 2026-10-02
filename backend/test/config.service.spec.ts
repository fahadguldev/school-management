import { ConfigError, getConfig, resetConfigCache } from '../src/common/config/config.service';

const VALID_ACCESS = 'a'.repeat(40);
const VALID_REFRESH = 'b'.repeat(40);

function withEnv(overrides: Record<string, string | undefined>): void {
  const base: Record<string, string | undefined> = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: VALID_ACCESS,
    JWT_REFRESH_SECRET: VALID_REFRESH,
    DB_PASSWORD: 'a-real-password',
    DB_HOST: 'db.internal',
    ALLOWED_ORIGINS: 'https://school.example.com',
  };

  for (const key of [
    'NODE_ENV',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_PASSWORD',
    'DB_HOST',
    'ALLOWED_ORIGINS',
    'ALLOW_SQLITE_FALLBACK',
    'DB_SYNCHRONIZE',
    'DB_MIGRATIONS_RUN',
    'DB_SSL',
  ]) {
    delete process.env[key];
  }

  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }

  resetConfigCache();
}

function build() {
  try {
    getConfig();
    return null;
  } catch (error) {
    return error as ConfigError;
  }
}

describe('configuration validation', () => {
  afterEach(() => {
    withEnv({});
  });

  it('accepts a fully specified production configuration', () => {
    withEnv({});

    expect(build()).toBeNull();
    expect(getConfig().isProduction).toBe(true);
    expect(getConfig().jwt.accessSecret).toBe(VALID_ACCESS);
  });

  it('refuses to boot without JWT secrets', () => {
    withEnv({ JWT_ACCESS_SECRET: undefined, JWT_REFRESH_SECRET: undefined });

    const error = build();
    expect(error).toBeInstanceOf(ConfigError);
    expect(error?.problems.join(' ')).toMatch(/JWT_ACCESS_SECRET is not set/);
    expect(error?.problems.join(' ')).toMatch(/JWT_REFRESH_SECRET is not set/);
  });

  it('refuses the historical development placeholders', () => {
    withEnv({
      JWT_ACCESS_SECRET: 'dev-access-secret-change-me',
      JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me',
    });

    const error = build();
    expect(error?.problems.join(' ')).toMatch(/placeholder/);
  });

  it('refuses a short secret', () => {
    withEnv({ JWT_ACCESS_SECRET: 'too-short' });

    expect(build()?.problems.join(' ')).toMatch(/at least 32 characters/);
  });

  it('refuses identical access and refresh secrets', () => {
    withEnv({ JWT_REFRESH_SECRET: VALID_ACCESS });

    expect(build()?.problems.join(' ')).toMatch(/must differ/);
  });

  it('never leaves a default secret behind in non-production either', () => {
    withEnv({ NODE_ENV: 'development', JWT_ACCESS_SECRET: undefined });

    expect(build()).toBeInstanceOf(ConfigError);
  });

  it('refuses the SQLite fallback in production', () => {
    withEnv({ ALLOW_SQLITE_FALLBACK: 'true' });

    const error = build();
    expect(error?.problems.join(' ')).toMatch(
      /ALLOW_SQLITE_FALLBACK must not be enabled in production/,
    );
  });

  it('refuses schema synchronize in production', () => {
    withEnv({ DB_SYNCHRONIZE: 'true' });

    expect(build()?.problems.join(' ')).toMatch(
      /DB_SYNCHRONIZE must not be enabled in production/,
    );
  });

  it('refuses localhost origins in production', () => {
    withEnv({ ALLOWED_ORIGINS: 'http://localhost:3000' });

    expect(build()?.problems.join(' ')).toMatch(/must not reference localhost/);
  });

  it('refuses an empty database password in production', () => {
    withEnv({ DB_PASSWORD: undefined });

    expect(build()?.problems.join(' ')).toMatch(/DB_PASSWORD must be set/);
  });

  it('allows the development fallback and synchronize outside production', () => {
    withEnv({
      NODE_ENV: 'development',
      DB_PASSWORD: undefined,
      ALLOW_SQLITE_FALLBACK: 'true',
      DB_SYNCHRONIZE: 'true',
      ALLOWED_ORIGINS: undefined,
    });

    expect(build()).toBeNull();
    expect(getConfig().database.allowSqliteFallback).toBe(true);
    expect(getConfig().database.synchronize).toBe(true);
  });

  it('runs migrations by default in production and never there by accident', () => {
    withEnv({});
    expect(getConfig().database.migrationsRun).toBe(true);

    withEnv({ NODE_ENV: 'development', DB_PASSWORD: undefined });
    expect(getConfig().database.migrationsRun).toBe(false);
  });

  it('explains how to recover in the error message', () => {
    withEnv({ JWT_ACCESS_SECRET: undefined });

    expect(build()?.message).toMatch(/\.env\.example/);
    expect(build()?.message).toMatch(/secrets:generate/);
  });
});