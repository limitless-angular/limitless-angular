import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['package.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredDependencies: [
            '@sanity/client',
            'react',
            'react-dom',
            'styled-components',
          ],
        },
      ],
    },
  },
];
