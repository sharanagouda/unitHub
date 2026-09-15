/** Pure-logic unit tests only — no emulator. See src/logic/*.test.ts. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
