import jsonc_eslint_parser from 'jsonc-eslint-parser';
import baseConfig from '../../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        { ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs}'] },
      ],
    },
    languageOptions: {
      parser: jsonc_eslint_parser,
    },
  },
];
