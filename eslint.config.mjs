import expo from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier/flat';
import { plugin as tsPlugin } from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...expo,
  prettier,
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'coverage/', 'supabase/.temp/', '.opencode/'],
  },
  {
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // strictness beyond expo defaults — foundation must stay clean
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Node CLI scripts (seeders, tooling) — console output is their interface.
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },
];
