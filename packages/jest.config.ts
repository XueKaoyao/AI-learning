import type { Config } from 'jest';
import path from 'path';

const config: Config = {
  displayName: 'packages',
  rootDir: path.resolve(__dirname),

  // Node environment for pure logic packages (no DOM needed)
  testEnvironment: 'node',

  // ts-jest preset handles TypeScript transformation
  preset: 'ts-jest',

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },

  // Critical: workspace packages are symlinked into node_modules/@myworkspace.
  // We must NOT ignore them; ts-jest must transform them.
  transformIgnorePatterns: ['node_modules/(?!@myworkspace/)'],

  testMatch: [
    '<rootDir>/utils/**/__tests__/**/*.test.ts',
    '<rootDir>/utils/**/*.test.ts',
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  clearMocks: true,
};

export default config;
