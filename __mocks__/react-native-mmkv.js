/**
 * Manual Jest mock. The real package's `isTest()` check (see its own
 * `lib/isTest.js`) is supposed to swap in an in-memory mock automatically
 * under Jest, but that check runs too late: `createMMKV.js` unconditionally
 * imports `react-native-nitro-modules` at module-evaluation time, before the
 * check is ever reached, which throws ("NitroModules could not be found")
 * in any environment without the real native module. Hence this — a small
 * reactive in-memory store, faithful enough to `useMMKVString`'s behavior
 * (shared across every component subscribed to the same key) for component
 * tests that read/write a persisted value, e.g. the theme override.
 */
const React = require('react');

const store = new Map();
const listeners = new Map(); // key -> Set<() => void>

function notify(key) {
  const set = listeners.get(key);
  if (set) set.forEach(fn => fn());
}

function useMMKVString(key) {
  const [, forceRender] = React.useReducer(n => n + 1, 0);

  React.useEffect(() => {
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(forceRender);
    return () => set.delete(forceRender);
  }, [key, forceRender]);

  const setValue = next => {
    const resolved = typeof next === 'function' ? next(store.get(key)) : next;
    if (resolved === undefined) {
      store.delete(key);
    } else {
      store.set(key, resolved);
    }
    notify(key);
  };

  return [store.get(key), setValue];
}

module.exports = { useMMKVString };
