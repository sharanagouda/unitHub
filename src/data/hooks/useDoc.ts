import { useEffect, useState } from 'react';
import { onSnapshot, type DocumentData, type DocumentReference } from '@react-native-firebase/firestore';

export interface DocState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribes to a single document. Pass `null` to skip subscribing (e.g.
 * while a parent id isn't known yet).
 *
 * `ref` is an effect dependency by identity — the ref builders in
 * `@data/refs` return a new reference on every call, so callers doing
 * conditional or computed lookups should memoize the ref (`useMemo`) rather
 * than constructing it inline on every render.
 */
export function useDoc<T extends DocumentData>(ref: DocumentReference<T> | null): DocState<T> {
  const [state, setState] = useState<DocState<T>>({
    data: null,
    loading: ref != null,
    error: null,
  });

  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState({ data: null, loading: true, error: null });

    return onSnapshot(
      ref,
      snapshot => setState({ data: snapshot.exists() ? snapshot.data() : null, loading: false, error: null }),
      error => setState({ data: null, loading: false, error }),
    );
  }, [ref]);

  return state;
}
