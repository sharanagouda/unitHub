import { useEffect, useState } from 'react';
import { onSnapshot, type DocumentData, type Query } from '@react-native-firebase/firestore';

export interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribes to a query (a collection ref from `@data/refs`, or a `query(...)`
 * built on top of one). Pass `null` to skip subscribing.
 *
 * Same caveat as `useDoc`: `query` is an effect dependency by identity, so a
 * query built with `where`/`orderBy` should be memoized by the caller or it
 * resubscribes on every render.
 */
export function useCollection<T extends DocumentData>(query: Query<T> | null): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({
    data: [],
    loading: query != null,
    error: null,
  });

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    setState({ data: [], loading: true, error: null });

    return onSnapshot(
      query,
      snapshot => setState({ data: snapshot.docs.map(d => d.data()), loading: false, error: null }),
      error => setState({ data: [], loading: false, error }),
    );
  }, [query]);

  return state;
}
