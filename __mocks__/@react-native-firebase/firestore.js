/**
 * Manual Jest mock — see auth.js in this directory for why.
 *
 * Every ref/query this produces carries a `.path` (the collection path,
 * e.g. "tenancies") and, for a `query()` result, `.constraints` (the
 * `where()`/`orderBy()` descriptors) — not because real Firestore refs look
 * like this, but so a test's `onSnapshot` mock can tell which subscription
 * is which and route fake data accordingly. See
 * src/features/testUtils/fakeFirestore.ts.
 */
function makeRef(path, extra = {}) {
  const ref = { path, ...extra };
  ref.withConverter = jest.fn(() => ref);
  return ref;
}

module.exports = {
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
  collection: jest.fn((_db, path) => makeRef(path, { type: 'collection' })),
  // Always called as doc(collectionRef, id) in this codebase — no auto-id case.
  doc: jest.fn((parentRef, id) => makeRef(`${parentRef.path}/${id}`, { type: 'document' })),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  orderBy: jest.fn((field, direction = 'asc') => ({ field, direction })),
  query: jest.fn((ref, ...constraints) => makeRef(ref.path, { type: 'query', constraints })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => undefined })),
  setDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn(() => () => {}),
};
