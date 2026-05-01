module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  forceExit: true,
  globalTeardown: '<rootDir>/tests/integration/teardown.cjs',
};
