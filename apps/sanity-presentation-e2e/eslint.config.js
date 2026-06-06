import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    ignores: ['.auth/**', 'test-results/**', 'playwright-report/**'],
  },
];
