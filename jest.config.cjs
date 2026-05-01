/** Default unit tests (`npm test`). Integration uses `jest.integration.config.cjs`. */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  passWithNoTests: true,
};
