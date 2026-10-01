import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  collection: vi.fn((_db, name: string) => name),
  doc: vi.fn((_db, collectionName: string, id: string) => ({collectionName, id})),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((...constraints: unknown[]) => constraints),
  serverTimestamp: vi.fn(() => 'server-time'),
  setDoc: vi.fn(),
  where: vi.fn((field: string, operator: string, value: string) => ({field, operator, value})),
  writeBatch: vi.fn(),
}));

vi.mock('./firebase', () => ({db: 'database', storage: 'storage'}));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(), arrayRemove: vi.fn(), collection: mocks.collection, deleteDoc: vi.fn(), doc: mocks.doc, getDoc: mocks.getDoc,
  getDocs: mocks.getDocs, limit: vi.fn(), query: mocks.query, serverTimestamp: mocks.serverTimestamp, setDoc: mocks.setDoc, updateDoc: vi.fn(),
  where: mocks.where, writeBatch: mocks.writeBatch,
}));
vi.mock('firebase/storage', () => ({deleteObject: vi.fn(), getDownloadURL: vi.fn(), ref: vi.fn(), uploadBytes: vi.fn()}));

import {getStudentSubmissions, saveAttendance} from './services';

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

describe('saveAttendance', () => {
  const teacherSnapshot = {exists: () => true, data: () => ({role: 'teacher', status: 'active'})};
  const ownedClassSnapshot = {exists: () => true, data: () => ({teacherId: 'teacher-1'})};
  const enrolledSnapshot = {docs: [{id: 'student-1'}, {id: 'student-2'}]};

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDoc.mockReset();
    mocks.getDocs.mockReset();
    mocks.setDoc.mockReset();
    mocks.writeBatch.mockReset();
    mocks.getDoc.mockResolvedValueOnce(teacherSnapshot).mockResolvedValueOnce(ownedClassSnapshot);
    mocks.getDocs
      .mockResolvedValueOnce(enrolledSnapshot)
      .mockResolvedValueOnce({docs: [{id: 'class-1_student-1_2026-08-27', data: () => ({classId: 'class-1'})}]});
    mocks.setDoc.mockResolvedValue(undefined);
  });

  it('creates new records with createdAt and updates existing records without replacing createdAt', async () => {
    const batch = {set: vi.fn(), update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined)};
    mocks.writeBatch.mockReturnValue(batch);

    await expect(saveAttendance('class-1', '2026-08-27', 'teacher-1', [
      {studentId: 'student-1', status: 'present', remarks: ''},
      {studentId: 'student-2', status: 'late', remarks: 'Traffic'},
    ])).resolves.toMatchObject({attendanceSaved: true, sessionSummarySaved: true});

    expect(batch.update).toHaveBeenCalledOnce();
    expect(batch.update.mock.calls[0][1]).not.toHaveProperty('createdAt');
    expect(batch.set).toHaveBeenCalledOnce();
    expect(batch.set.mock.calls[0][1]).toMatchObject({createdAt: 'server-time', recordedBy: 'teacher-1'});
    expect(batch.commit).toHaveBeenCalledOnce();
  });

  it('retries one transient attendance commit failure', async () => {
    const first = {set: vi.fn(), update: vi.fn(), commit: vi.fn().mockRejectedValue({code: 'unavailable'})};
    const second = {set: vi.fn(), update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined)};
    mocks.writeBatch.mockReturnValueOnce(first).mockReturnValueOnce(second);

    await expect(saveAttendance('class-1', '2026-08-27', 'teacher-1', [
      {studentId: 'student-1', status: 'present', remarks: ''},
    ])).resolves.toMatchObject({attendanceSaved: true});
    expect(first.commit).toHaveBeenCalledOnce();
    expect(second.commit).toHaveBeenCalledOnce();
  });

  it('rejects a class that does not belong to the authenticated teacher before writing', async () => {
    vi.clearAllMocks();
    mocks.getDoc.mockReset();
    mocks.getDocs.mockReset();
    mocks.getDoc
      .mockResolvedValueOnce(teacherSnapshot)
      .mockResolvedValueOnce({exists: () => true, data: () => ({teacherId: 'other-teacher'})});
    mocks.getDocs.mockResolvedValueOnce(enrolledSnapshot);

    await expect(saveAttendance('class-1', '2026-08-27', 'teacher-1', [
      {studentId: 'student-1', status: 'present', remarks: ''},
    ])).rejects.toMatchObject({
      name: 'AttendanceSaveError', stage: 'attendance-validation', code: 'permission-denied',
    });
    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });

  it('reports a failed optional session summary without reporting the attendance batch as failed', async () => {
    const batch = {set: vi.fn(), update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined)};
    mocks.writeBatch.mockReturnValue(batch);
    mocks.setDoc.mockRejectedValue({code: 'permission-denied'});

    await expect(saveAttendance('class-1', '2026-08-27', 'teacher-1', [
      {studentId: 'student-1', status: 'present', remarks: ''},
    ])).resolves.toEqual({
      attendanceSaved: true, sessionSummarySaved: false, sessionSummaryErrorCode: 'permission-denied',
    });
  });
});
