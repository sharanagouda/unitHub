import { z } from 'zod';
import type { DocumentData, QueryDocumentSnapshot } from '@react-native-firebase/firestore';
import { docConverter } from '../converter';

const widgetSchema = z.object({ id: z.string(), name: z.string() });

function fakeSnapshot(id: string, data: DocumentData): QueryDocumentSnapshot<DocumentData, DocumentData> {
  return { id, data: () => data } as QueryDocumentSnapshot<DocumentData, DocumentData>;
}

describe('docConverter', () => {
  const converter = docConverter(widgetSchema);

  it('injects the snapshot id into the parsed document', () => {
    const parsed = converter.fromFirestore(fakeSnapshot('w1', { name: 'Widget' }));
    expect(parsed).toEqual({ id: 'w1', name: 'Widget' });
  });

  it('rejects a document that fails schema validation', () => {
    expect(() => converter.fromFirestore(fakeSnapshot('w1', { name: 42 }))).toThrow();
  });

  it('strips id before writing, since it belongs only in the path', () => {
    const written = converter.toFirestore({ id: 'w1', name: 'Widget' });
    expect(written).toEqual({ name: 'Widget' });
    expect(written).not.toHaveProperty('id');
  });
});
