import { getFirestore, type Firestore } from '@react-native-firebase/firestore';

let db: Firestore | undefined;

/** The default-app Firestore instance, created once and reused. */
export function firestoreDb(): Firestore {
  db ??= getFirestore();
  return db;
}
