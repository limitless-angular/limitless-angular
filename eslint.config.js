import jsonc_eslint_parser from 'jsonc-eslint-parser';
import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/{eslint,tailwind,vite,vitest}.config.{js,cjs,mjs,ts,mts}',
          ],
          ignoredDependencies: [
            '@limitless-angular/sanity',
            'lru-cache',
            'vitest',
            '@testing-library/angular',
          ],
        },
      ],
      // TODO: what?
      '@typescript-eslint/no-unused-expressions': 'off',
    },
    languageOptions: { parser: jsonc_eslint_parser },
  },
];
