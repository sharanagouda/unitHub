import { Platform } from 'react-native';
import { connectAuthEmulator } from '@react-native-firebase/auth';
import { connectFunctionsEmulator } from '@react-native-firebase/functions';
import { connectFirestoreEmulator } from '@react-native-firebase/firestore';
import { firestoreDb } from '@data/firestore';
import { authInstance } from './auth';
import { functionsInstance } from './functions';

// 10.0.2.2 is the Android emulator's alias for the host machine's localhost;
// the iOS simulator can reach the host directly.
const EMULATOR_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

// Ports match firebase.json's emulators block / `npm run emulators`.
const FIRESTORE_PORT = 8080;
const FUNCTIONS_PORT = 5001;
const AUTH_PORT = 9099;

let connected = false;

/**
 * Points Firestore, Auth and Functions at the local emulator suite. Dev-only
 * and idempotent — call once, before any Firebase call, e.g. at the top of
 * App.tsx. Without this, a dev build would talk to production, which is
 * exactly what docs/SETUP.md's two-project split (unithub-dev / unithub-prod)
 * exists to prevent.
 */
export function connectEmulatorsInDev(): void {
  if (!__DEV__ || connected) return;
  connected = true;

  connectFirestoreEmulator(firestoreDb(), EMULATOR_HOST, FIRESTORE_PORT);
  connectAuthEmulator(authInstance(), `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true });
  connectFunctionsEmulator(functionsInstance(), EMULATOR_HOST, FUNCTIONS_PORT);
}
