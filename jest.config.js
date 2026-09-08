/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // .mjs CLI scripts (scan-secrets) are ESM — transform them like the rest.
  transform: { '^.+\\.[jt]sx?$': 'babel-jest', '^.+\\.mjs$': 'babel-jest' },
  collectCoverageFrom: ['lib/**/*.ts', 'hooks/**/*.ts', 'store/**/*.ts', '!**/*.d.ts'],
  coverageThreshold: {
    global: { branches: 50, functions: 50, lines: 50, statements: 50 },
  },
};
