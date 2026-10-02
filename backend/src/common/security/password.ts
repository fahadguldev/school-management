import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';

const LEGACY_SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const BCRYPT_PATTERN = /^\$2[aby]?\$\d{2}\$/;

const DEFAULT_ROUNDS = 12;
const MIN_ROUNDS = 10;

export function getBcryptRounds(): number {
  const raw = process.env.BCRYPT_ROUNDS;
  if (!raw) {
    return DEFAULT_ROUNDS;
  }

  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < MIN_ROUNDS || parsed > 15) {
    throw new Error(
      `BCRYPT_ROUNDS must be an integer between ${MIN_ROUNDS} and 15, received "${raw}".`,
    );
  }

  return parsed;
}

export function isBcryptHash(hash: string | null | undefined): boolean {
  return typeof hash === 'string' && BCRYPT_PATTERN.test(hash);
}

export function isLegacySha256Hash(hash: string | null | undefined): boolean {
  return typeof hash === 'string' && LEGACY_SHA256_PATTERN.test(hash);
}

export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('Password must be a non-empty string.');
  }

  return bcrypt.hash(plain, getBcryptRounds());
}

function verifyLegacySha256(plain: string, hash: string): boolean {
  const candidate = createHash('sha256').update(plain).digest('hex');
  const candidateBuffer = Buffer.from(candidate, 'hex');
  const hashBuffer = Buffer.from(hash, 'hex');

  if (candidateBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateBuffer, hashBuffer);
}

export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (typeof plain !== 'string' || typeof hash !== 'string' || hash.length === 0) {
    return false;
  }

  if (isBcryptHash(hash)) {
    return bcrypt.compare(plain, hash);
  }

  if (isLegacySha256Hash(hash)) {
    return verifyLegacySha256(plain, hash);
  }

  return false;
}

export function needsRehash(hash: string | null | undefined): boolean {
  if (!isBcryptHash(hash)) {
    return true;
  }

  const match = BCRYPT_PATTERN.exec(hash as string);
  const cost = match ? parseInt(match[0].slice(4, 6), 10) : 0;
  return cost < getBcryptRounds();
}