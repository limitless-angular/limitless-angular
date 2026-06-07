import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import jsonc_eslint_parser from 'jsonc-eslint-parser';
import tseslint from 'typescript-eslint';

const jsFiles = ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'];
const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];
const runtimeGlobals = {
  ...globals.browser,
  ...globals.node,
};
const typescriptEslintRulesFromNx = {
  '@typescript-eslint/explicit-member-accessibility': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-non-null-assertion': 'warn',
  '@typescript-eslint/adjacent-overload-signatures': 'error',
  '@typescript-eslint/prefer-namespace-keyword': 'error',
  'no-empty-function': 'off',
  '@typescript-eslint/no-empty-function': 'error',
  '@typescript-eslint/no-inferrable-types': 'error',
  '@typescript-eslint/no-unused-vars': 'warn',
  '@typescript-eslint/no-empty-interface': 'error',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-require-imports': 'off',
};

export default [
  {
    ignores: ['**/.angular/**', '**/.turbo/**', '**/dist/**'],
  },
  {
    ...eslint.configs.recommended,
    files: jsFiles,
    languageOptions: {
      globals: runtimeGlobals,
    },
  },
  {
    ...eslint.configs.recommended,
    files: tsFiles,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: config.files ?? tsFiles,
  })),
  {
    files: [...tsFiles, ...jsFiles],
    languageOptions: {
      globals: runtimeGlobals,
    },
    // Override or add rules here
    rules: {},
  },
  {
    files: tsFiles,
    rules: {
      ...typescriptEslintRulesFromNx,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: jsFiles,
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.json'],
    languageOptions: { parser: jsonc_eslint_parser },
  },
  eslintConfigPrettier,
];
