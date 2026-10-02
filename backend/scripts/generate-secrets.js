#!/usr/bin/env node
/**
 * Generates strong JWT signing secrets and prints them as .env lines.
 *
 * Usage:
 *   npm run secrets:generate            # print to stdout
 *   npm run secrets:generate -- --write # append/replace them in backend/.env
 */
const { randomBytes } = require('crypto');
const { existsSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const BACKEND_DIR = join(__dirname, '..');
const ENV_PATH = join(BACKEND_DIR, '.env');

function generateSecret() {
  return randomBytes(48).toString('base64url');
}

const secrets = {
  JWT_ACCESS_SECRET: generateSecret(),
  JWT_REFRESH_SECRET: generateSecret(),
};

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  return pattern.test(content)
    ? content.replace(pattern, line)
    : `${content.trimEnd()}\n${line}\n`;
}

function main() {
  const shouldWrite = process.argv.includes('--write');

  if (!shouldWrite) {
    console.log('\nAdd these to backend/.env:\n');
    console.log(`JWT_ACCESS_SECRET=${secrets.JWT_ACCESS_SECRET}`);
    console.log(`JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}\n`);
    return;
  }

  let content = existsSync(ENV_PATH)
    ? readFileSync(ENV_PATH, 'utf8')
    : '# backend/.env\n';

  for (const [key, value] of Object.entries(secrets)) {
    content = upsertEnv(content, key, value);
  }

  writeFileSync(ENV_PATH, content, 'utf8');
  console.log(`\nWrote fresh JWT secrets to ${ENV_PATH}`);
  console.log(
    'NOTE: existing sessions will be invalidated because the signing keys changed.\n',
  );
}

main();