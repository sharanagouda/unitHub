import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { authInstance } from './auth';

export interface AuthUserState {
  user: User | null;
  /** True until the first onAuthStateChanged callback fires. */
  initializing: boolean;
}

export function useAuthUser(): AuthUserState {
  const [state, setState] = useState<AuthUserState>({ user: null, initializing: true });

  useEffect(
    () => onAuthStateChanged(authInstance(), user => setState({ user, initializing: false })),
    [],
  );

  return state;
}
