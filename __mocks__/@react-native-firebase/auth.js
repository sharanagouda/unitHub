/**
 * Manual Jest mock. The real package's modular API falls back to the
 * firebase-js-sdk (ESM, a long transitive dependency chain) whenever the
 * native TurboModule isn't present — true in any Jest run — which is
 * impractical to transform and pointless to execute for real in a test. See
 * jest.config.js's `app` project.
 */
module.exports = {
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  signInWithPhoneNumber: jest.fn(() => Promise.resolve({ confirm: jest.fn() })),
  signOut: jest.fn(() => Promise.resolve()),
  connectAuthEmulator: jest.fn(),
};
