import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  uploadBytes: vi.fn(async () => undefined),
  getDownloadURL: vi.fn(async (target: {path: string}) => `https://storage.test/${target.path}`),
  deleteObject: vi.fn(async () => undefined),
  ref: vi.fn((_storage: unknown, path: string) => ({path})),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({collection, id})),
  setDoc: vi.fn(async () => undefined),
  serverTimestamp: vi.fn(() => 'server-time'),
}));

vi.mock('../firebase', () => ({db: 'database', storage: 'storage'}));
vi.mock('firebase/storage', () => ({deleteObject: mocks.deleteObject, getDownloadURL: mocks.getDownloadURL, ref: mocks.ref, uploadBytes: mocks.uploadBytes}));
vi.mock('firebase/firestore', () => ({doc: mocks.doc, setDoc: mocks.setDoc, serverTimestamp: mocks.serverTimestamp}));

import {submitStudentImageActivity} from './imageSubmissions.service';

const activity = {
  id: 'activity-1', classId: 'class-1', title: 'PETA', description: '',
  activityCategory: 'peta', status: 'active', acceptsImageAttachments: true, dueDate: new Date('2099-01-01'), totalPoints: 100, createdBy: 'teacher-1',
} as const;

describe('student image submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', {randomUUID: vi.fn(() => 'file-id')});
  });

  it('rejects non-WebP files before touching Storage', async () => {
    await expect(submitStudentImageActivity(activity, 'student-1', [new File(['jpg'], 'photo.jpg', {type: 'image/jpeg'})])).rejects.toThrow('converted to WebP');
    expect(mocks.uploadBytes).not.toHaveBeenCalled();
  });

  it('uploads canonical WebP metadata and short-safe filenames', async () => {
    const result = await submitStudentImageActivity(activity, 'student-1', [new File(['webp'], 'My photo.webp', {type: 'image/webp'})]);
    expect(mocks.uploadBytes).toHaveBeenCalledWith(
      {path: 'activity-submissions/activity-1/student-1/file-id-My-photo.webp'},
      expect.objectContaining({name: 'My-photo.webp', type: 'image/webp'}),
      {contentType: 'image/webp'},
    );
    expect(result[0]).toMatchObject({fileName: 'My-photo.webp', contentType: 'image/webp', order: 0});
    expect(mocks.setDoc).toHaveBeenCalledWith(
      {collection: 'activitySubmissions', id: 'activity-1_student-1'},
      expect.objectContaining({studentId: 'student-1', score: null, remarks: ''}),
    );
  });
});
