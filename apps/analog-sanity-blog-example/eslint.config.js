import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.js';

const originalEnforceModuleBoundaries = baseConfig.find(
  (config) => config.rules?.['@nx/enforce-module-boundaries'],
).rules['@nx/enforce-module-boundaries'];

// Allow analog sanity blog imports
originalEnforceModuleBoundaries[1].allow.push(
  '@/analog-sanity-blog-example/sanity',
);

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'Blog', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'blog', style: 'kebab-case' },
      ],
      '@angular-eslint/component-class-suffix': [
        'error',
        { suffixes: ['Component', 'Page'] },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
