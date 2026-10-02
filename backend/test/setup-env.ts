/**
 * Runs before every test module is loaded, so `getConfig()` sees deterministic
 * values and the config validation never trips over a missing .env file.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  'test-access-secret-000000000000000000000000000';
process.env.JWT_REFRESH_SECRET =
  'test-refresh-secret-111111111111111111111111111';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Lowest cost bcrypt accepts; keeps the suite fast while still exercising the
// real hashing path.
process.env.BCRYPT_ROUNDS = '10';

export {};