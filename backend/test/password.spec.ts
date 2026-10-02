import { createHash } from 'crypto';
import {
  hashPassword,
  isBcryptHash,
  isLegacySha256Hash,
  needsRehash,
  verifyPassword,
} from '../src/common/security/password';

function legacyHash(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

describe('password hashing', () => {
  it('produces a bcrypt hash rather than a bare digest', async () => {
    const hash = await hashPassword('CorrectHorseBattery');

    expect(isBcryptHash(hash)).toBe(true);
    expect(hash).not.toContain('CorrectHorseBattery');
    expect(hash).toHaveLength(60);
  });

  it('salts each hash independently', async () => {
    const first = await hashPassword('same-password');
    const second = await hashPassword('same-password');

    expect(first).not.toEqual(second);
  });

  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('CorrectHorseBattery');

    await expect(verifyPassword('CorrectHorseBattery', hash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword('correcthorsebattery', hash)).resolves.toBe(
      false,
    );
  });

  it('rejects an empty password', async () => {
    await expect(hashPassword('')).rejects.toThrow(/non-empty/);
  });

  it('still verifies legacy unsalted SHA-256 hashes so nobody is locked out', async () => {
    const hash = legacyHash('LegacySecret1');

    expect(isLegacySha256Hash(hash)).toBe(true);
    await expect(verifyPassword('LegacySecret1', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('flags legacy and under-cost hashes for upgrade', async () => {
    expect(needsRehash(legacyHash('LegacySecret1'))).toBe(true);
    expect(needsRehash(null)).toBe(true);
    expect(needsRehash('not-a-real-hash')).toBe(true);

    const current = await hashPassword('CorrectHorseBattery');
    expect(needsRehash(current)).toBe(false);
  });

  it('flags a bcrypt hash created at a lower cost', () => {
    const weak = `$2b$04$${'a'.repeat(53)}`;

    expect(isBcryptHash(weak)).toBe(true);
    expect(needsRehash(weak)).toBe(true);
  });

  it('returns false rather than throwing for unusable stored hashes', async () => {
    await expect(verifyPassword('anything', '')).resolves.toBe(false);
    await expect(verifyPassword('anything', null)).resolves.toBe(false);
    await expect(verifyPassword('anything', 'garbage')).resolves.toBe(false);
  });

  it('rejects an out-of-range BCRYPT_ROUNDS instead of silently using it', () => {
    const original = process.env.BCRYPT_ROUNDS;

    try {
      process.env.BCRYPT_ROUNDS = '4';
      expect(() => needsRehash('$2b$12$abc')).toThrow(/BCRYPT_ROUNDS/);

      process.env.BCRYPT_ROUNDS = '99';
      expect(() => needsRehash('$2b$12$abc')).toThrow(/BCRYPT_ROUNDS/);
    } finally {
      process.env.BCRYPT_ROUNDS = original;
    }
  });
});