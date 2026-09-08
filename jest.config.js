/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // `@/` path alias (mirrors tsconfig.json) so feature tests import like app code.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-font$': '<rootDir>/__tests__/mocks/expo-font.js',
  },
  transform: { '^.+\\.[jt]sx?$': 'babel-jest', '^.+\\.mjs$': 'babel-jest' },
  collectCoverageFrom: ['lib/**/*.ts', 'hooks/**/*.ts', 'store/**/*.ts', '!**/*.d.ts'],
  coverageThreshold: {
    global: { branches: 50, functions: 50, lines: 50, statements: 50 },
  },
};
