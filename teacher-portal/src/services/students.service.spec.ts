import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  doc: vi.fn(() => 'student-document'),
  getDownloadURL: vi.fn(async () => 'https://storage.example/avatar.webp'),
  serverTimestamp: vi.fn(() => 'server-time'),
  storageRef: vi.fn((_storage, path: string) => ({path})),
  updateDoc: vi.fn(async () => undefined),
  uploadBytes: vi.fn(async () => undefined),
}));

vi.mock('../firebase', () => ({db: 'database', storage: 'storage'}));
vi.mock('../services', () => ({
  archiveStudent: vi.fn(), claimRosterStudent: vi.fn(), findRosterStudent: vi.fn(),
  getStudentRecordByUserId: vi.fn(), getStudentsByClass: vi.fn(), saveStudent: vi.fn(),
  updateStudentProfile: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: mocks.doc,
  serverTimestamp: mocks.serverTimestamp,
  updateDoc: mocks.updateDoc,
}));
vi.mock('firebase/storage', () => ({
  getDownloadURL: mocks.getDownloadURL,
  ref: mocks.storageRef,
  uploadBytes: mocks.uploadBytes,
}));

import {
  MAX_PROFILE_PHOTO_BYTES,
  studentProfilePhotoPath,
  uploadStudentProfilePhoto,
} from './students.service';

describe('student profile photo service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the shared mobile-app storage path and saves the download URL', async () => {
    const image = new File(['image'], 'avatar.webp', {type: 'image/webp'});

    await expect(uploadStudentProfilePhoto('student-1', image))
      .resolves.toBe('https://storage.example/avatar.webp');

    expect(studentProfilePhotoPath('student-1')).toBe('student-profile-images/student-1/avatar');
    expect(mocks.storageRef).toHaveBeenCalledWith('storage', 'student-profile-images/student-1/avatar');
    expect(mocks.uploadBytes).toHaveBeenCalledWith(
      {path: 'student-profile-images/student-1/avatar'},
      image,
      {contentType: 'image/webp', cacheControl: 'private,max-age=3600'},
    );
    expect(mocks.updateDoc).toHaveBeenCalledWith('student-document', {
      photoUrl: 'https://storage.example/avatar.webp',
      updatedAt: 'server-time',
    });
  });

  it('rejects non-image files and oversized images before uploading', async () => {
    const textFile = new File(['text'], 'notes.txt', {type: 'text/plain'});
    const oversizedImage = new File(
      [new Uint8Array(MAX_PROFILE_PHOTO_BYTES + 1)],
      'large.png',
      {type: 'image/png'},
    );

    await expect(uploadStudentProfilePhoto('student-1', textFile))
      .rejects.toThrow('Please choose a valid image file.');
    await expect(uploadStudentProfilePhoto('student-1', oversizedImage))
      .rejects.toThrow('Profile photos must be 5 MB or smaller.');
    expect(mocks.uploadBytes).not.toHaveBeenCalled();
  });
});
