import { getAuth, type Auth } from '@react-native-firebase/auth';

let instance: Auth | undefined;

/** The default-app Auth instance, created once and reused. */
export function authInstance(): Auth {
  instance ??= getAuth();
  return instance;
}
