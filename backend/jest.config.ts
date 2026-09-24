import type { Config } from '@jest/types';
import { defaults as jestDefaults } from 'jest-config';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  ...jestDefaults,
} as Config;