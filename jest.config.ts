import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Look for tests in Documents/Tests (relative to this config file)
  roots: ['../Documents/Tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    // Allow the test file's relative imports to resolve from the trading-analyst dir
    '^(\\.\\./\\.\\./trading-analyst/)(.*)$': '<rootDir>/$2',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: true,
      },
    }],
  },
};

export default config;
