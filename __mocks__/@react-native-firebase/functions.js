/** Manual Jest mock — see auth.js in this directory for why. */
module.exports = {
  getFunctions: jest.fn(() => ({})),
  connectFunctionsEmulator: jest.fn(),
  httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: {} }))),
};
