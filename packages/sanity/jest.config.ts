export default {
  displayName: 'sanity',
  preset: '../../jest.preset.cjs',
  coverageDirectory: '../../coverage/packages/sanity',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
};
