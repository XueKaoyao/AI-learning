import type { Config } from 'jest';

const config: Config = {
  projects: [
    '<rootDir>/packages/jest.config.ts',
    '<rootDir>/apps/ai-chatbot/jest.config.ts',
  ],

  // Shared coverage configuration
  collectCoverageFrom: [
    '<rootDir>/packages/utils/**/*.ts',
    '<rootDir>/apps/ai-chatbot/app/**/*.{ts,tsx}',
    '!<rootDir>/packages/utils/**/node_modules/**',
    '!<rootDir>/apps/ai-chatbot/node_modules/**',
    '!<rootDir>/apps/ai-chatbot/.next/**',
    '!<rootDir>/apps/ai-chatbot/app/**/*.d.ts',
    '!<rootDir>/apps/ai-chatbot/app/layout.tsx',
  ],
};

export default config;
