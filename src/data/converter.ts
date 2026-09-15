import type {
  DocumentData,
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  SetOptions,
  SnapshotOptions,
  WithFieldValue,
} from '@react-native-firebase/firestore';
import type { ZodType } from 'zod';

/**
 * Builds a Firestore converter from a zod schema.
 *
 * The document id lives in the Firestore path, never in the stored fields —
 * storing it twice is how it drifts. So it is injected from `snapshot.id` on
 * read, and stripped again on write.
 *
 * `schema.parse` is the only place a malformed document is caught: a doc
 * missing a field, or one written by an older schema version, throws here
 * instead of silently handing `undefined` to the rent engine.
 */
export function docConverter<T extends { id: string }>(
  schema: ZodType<T>,
): FirestoreDataConverter<T> {
  return {
    toFirestore(
      model: WithFieldValue<T> | PartialWithFieldValue<T>,
      _options?: SetOptions,
    ): WithFieldValue<DocumentData> | PartialWithFieldValue<DocumentData> {
      const rest: Record<string, unknown> = { ...(model as T) };
      delete rest.id;
      return rest as WithFieldValue<DocumentData>;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>,
      options?: SnapshotOptions,
    ): T {
      return schema.parse({ id: snapshot.id, ...snapshot.data(options) });
    },
  };
}
