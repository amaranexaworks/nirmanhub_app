/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Enforce feature isolation: no deep imports into another feature's internals.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@features/*/*'],
            message:
              'Import a feature only via its public index (e.g. @features/hiring), not its internals.',
          },
        ],
      },
    ],
  },
  ignorePatterns: ['dist', 'node_modules', 'vite.config.ts'],
};
