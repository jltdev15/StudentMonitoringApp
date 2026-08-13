import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  collection: vi.fn((_db, name: string) => name),
  getDocs: vi.fn(),
  query: vi.fn((...constraints: unknown[]) => constraints),
  where: vi.fn((field: string, operator: string, value: string) => ({field, operator, value})),
}));

vi.mock('./firebase', () => ({db: 'database', storage: 'storage'}));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(), arrayRemove: vi.fn(), collection: mocks.collection, deleteDoc: vi.fn(), doc: vi.fn(), getDoc: vi.fn(),
  getDocs: mocks.getDocs, limit: vi.fn(), query: mocks.query, serverTimestamp: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(),
  where: mocks.where, writeBatch: vi.fn(),
}));
vi.mock('firebase/storage', () => ({deleteObject: vi.fn(), getDownloadURL: vi.fn(), ref: vi.fn(), uploadBytes: vi.fn()}));

import {getStudentSubmissions} from './services';

describe('getStudentSubmissions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries every enrolled class together with the student identity and merges the results', async () => {
    mocks.getDocs
      .mockResolvedValueOnce({docs: [{id: 'one', data: () => ({studentId: 'student-1', classId: 'class-1'})}]})
      .mockResolvedValueOnce({docs: [{id: 'two', data: () => ({studentId: 'student-1', classId: 'class-2'})}]});

    await expect(getStudentSubmissions('student-1', ['class-1', 'class-2'])).resolves.toEqual([
      {id: 'one', studentId: 'student-1', classId: 'class-1'},
      {id: 'two', studentId: 'student-1', classId: 'class-2'},
    ]);
    expect(mocks.where).toHaveBeenCalledWith('studentId', '==', 'student-1');
    expect(mocks.where).toHaveBeenCalledWith('classId', '==', 'class-1');
    expect(mocks.where).toHaveBeenCalledWith('classId', '==', 'class-2');
  });

  it('does not query Firestore when the student has no active classes', async () => {
    await expect(getStudentSubmissions('student-1', [])).resolves.toEqual([]);
    expect(mocks.getDocs).not.toHaveBeenCalled();
  });
});
