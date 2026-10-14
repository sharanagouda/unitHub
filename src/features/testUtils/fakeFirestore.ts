import { onSnapshot } from '@react-native-firebase/firestore';

/**
 * A fake document store for component tests, keyed by collection path
 * ("tenancies", "rentPeriods", "rentPayments") — matching the `.path` every
 * ref/query carries under `__mocks__/@react-native-firebase/firestore.js`.
 * Each document needs an `id` field (the mock's `doc()` builds `path` as
 * `${collectionPath}/${id}`).
 */
export type FakeDb = Record<string, ReadonlyArray<Record<string, unknown>>>;

interface FakeRef {
  path: string;
  type: 'document' | 'collection' | 'query';
  constraints?: ReadonlyArray<{ field: string; op: string; value: unknown }>;
}

function matches(doc: Record<string, unknown>, constraints: FakeRef['constraints']): boolean {
  if (!constraints) return true;
  // Only equality is used anywhere in this app's queries (@data/refs.ts).
  return constraints.every(c => c.op !== '==' || doc[c.field] === c.value);
}

/**
 * Installs a path-routed `onSnapshot` over the manual Firestore mock, backed
 * by a plain in-memory `db`. A document ref resolves against `id`; a query
 * resolves against the collection named by `path`, filtered by its `where()`
 * constraints. Call once per test (or per `describe`, via `beforeEach`) —
 * each call replaces the previous implementation.
 */
export function installFakeFirestore(db: FakeDb): void {
  jest.mocked(onSnapshot).mockImplementation((ref: unknown, onNext: unknown) => {
    const r = ref as FakeRef;
    const next = onNext as (snapshot: unknown) => void;

    if (r.type === 'document') {
      const slash = r.path.lastIndexOf('/');
      const collectionPath = r.path.slice(0, slash);
      const id = r.path.slice(slash + 1);
      const doc = (db[collectionPath] ?? []).find(d => d.id === id);
      next({ exists: () => doc !== undefined, data: () => doc });
    } else {
      const docs = (db[r.path] ?? []).filter(d => matches(d, r.constraints));
      next({ docs: docs.map(d => ({ data: () => d })) });
    }

    return () => {};
  });
}
