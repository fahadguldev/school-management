import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadLocalEnvFile(): void {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadLocalEnvFile();

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface AppConfig {
  env: NodeEnvironment;
  isProduction: boolean;
  port: number;
  allowedOrigins: string[];
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    ssl: boolean;
    synchronize: boolean;
    migrationsRun: boolean;
    logging: boolean;
    allowSqliteFallback: boolean;
    connectTimeoutMs: number;
  };
}

/**
 * Values that shipped in earlier revisions as development defaults. Accepting any
 * of them in production would let a misconfigured deployment mint forgeable tokens.
 */
const INSECURE_SECRETS = [
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
  'change-me',
  'secret',
  'jwt-secret',
  'test-secret',
];

const MIN_SECRET_LENGTH = 32;

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(
      [
        'Refusing to start: invalid configuration.',
        ...problems.map((problem) => `  - ${problem}`),
        '',
        'Copy backend/.env.example to backend/.env and set real values.',
        'Generate strong secrets with:  npm run secrets:generate',
      ].join('\n'),
    );
    this.name = 'ConfigError';
  }
}

function readNodeEnvironment(): NodeEnvironment {
  const raw = (process.env.NODE_ENV || 'development').toLowerCase();

  if (raw === 'production' || raw === 'prod') {
    return 'production';
  }

  if (raw === 'test') {
    return 'test';
  }

  return 'development';
}

function readBoolean(raw: string | undefined, fallback = false): boolean {
  if (raw === undefined || raw === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function readList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) {
    return fallback;
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateSecrets(config: AppConfig): string[] {
  const problems: string[] = [];
  const { accessSecret, refreshSecret } = config.jwt;

  const check = (label: string, value: string) => {
    const normalized = value.trim();

    if (normalized.length === 0) {
      problems.push(`${label} is not set.`);
      return;
    }

    if (INSECURE_SECRETS.includes(normalized.toLowerCase())) {
      problems.push(`${label} still uses a known development placeholder value.`);
      return;
    }

    if (normalized.length < MIN_SECRET_LENGTH) {
      problems.push(
        `${label} must be at least ${MIN_SECRET_LENGTH} characters (got ${normalized.length}).`,
      );
    }
  };

  check('JWT_ACCESS_SECRET', accessSecret);
  check('JWT_REFRESH_SECRET', refreshSecret);

  if (accessSecret === refreshSecret) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.');
  }

  return problems;
}

function validateProduction(
  config: AppConfig,
  requested: { synchronize: boolean; allowSqliteFallback: boolean },
): string[] {
  if (!config.isProduction) {
    return [];
  }

  const problems: string[] = [];

  if (config.database.password.length === 0) {
    problems.push('DB_PASSWORD must be set in production.');
  }

  if (requested.allowSqliteFallback) {
    problems.push(
      'ALLOW_SQLITE_FALLBACK must not be enabled in production — data would be lost on restart.',
    );
  }

  if (requested.synchronize) {
    problems.push(
      'DB_SYNCHRONIZE must not be enabled in production — use migrations instead.',
    );
  }

  if (config.allowedOrigins.some((origin) => origin.includes('localhost'))) {
    problems.push(
      'ALLOWED_ORIGINS must not reference localhost in production.',
    );
  }

  return problems;
}

let cachedConfig: AppConfig | null = null;

function buildConfig(): AppConfig {
  const env = readNodeEnvironment();
  const isProduction = env === 'production';

  // Captured before the production overrides below so the guards can report what
  // was actually asked for, even though the value itself is forced off.
  const requested = {
    synchronize: readBoolean(process.env.DB_SYNCHRONIZE, false),
    allowSqliteFallback: readBoolean(process.env.ALLOW_SQLITE_FALLBACK, false),
  };

  const config: AppConfig = {
    env,
    isProduction,
    port: parseInt(process.env.PORT || '4001', 10),
    allowedOrigins: readList(process.env.ALLOWED_ORIGINS, [
      'http://localhost:3000',
      'http://localhost:3001',
    ]),
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || '',
      refreshSecret: process.env.JWT_REFRESH_SECRET || '',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || 'school_management',
      ssl: readBoolean(process.env.DB_SSL, false),
      // synchronize is a development convenience only and can destroy data, so it
      // is ignored entirely in production regardless of what the environment says.
      synchronize: requested.synchronize && !isProduction,
      migrationsRun: readBoolean(process.env.DB_MIGRATIONS_RUN, isProduction),
      logging: readBoolean(process.env.DB_LOGGING, false),
      allowSqliteFallback: requested.allowSqliteFallback && !isProduction,
      connectTimeoutMs: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '5000', 10),
    },
  };

  const problems = [
    ...validateSecrets(config),
    ...validateProduction(config, requested),
  ];

  if (problems.length > 0) {
    throw new ConfigError(problems);
  }

  return config;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = buildConfig();
  }

  return cachedConfig;
}

/** Test-only helper: drops the memoised config so env changes take effect. */
export function resetConfigCache(): void {
  cachedConfig = null;
}