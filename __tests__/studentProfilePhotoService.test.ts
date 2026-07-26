import {getDownloadURL, putFile, ref} from '@react-native-firebase/storage';
import {updateDoc} from '@react-native-firebase/firestore';
import {
  MAX_PROFILE_PHOTO_BYTES,
  studentProfilePhotoPath,
  uploadStudentProfilePhoto,
} from '../src/services/studentService';

beforeEach(() => {
  jest.clearAllMocks();
  (putFile as jest.Mock).mockResolvedValue(undefined);
  (getDownloadURL as jest.Mock).mockResolvedValue(
    'https://example.com/profile.jpg',
  );
  (updateDoc as jest.Mock).mockResolvedValue(undefined);
});

it('uploads a student photo to the deterministic avatar path and persists its URL', async () => {
  await expect(
    uploadStudentProfilePhoto('student-1', {
      contentType: 'image/jpeg',
      fileSize: 1024,
      uri: 'file:///profile.jpg',
    }),
  ).resolves.toBe('https://example.com/profile.jpg');

  expect(studentProfilePhotoPath('student-1')).toBe(
    'student-profile-images/student-1/avatar',
  );
  expect(ref).toHaveBeenCalledWith(
    expect.anything(),
    'student-profile-images/student-1/avatar',
  );
  expect(putFile).toHaveBeenCalledWith(
    expect.objectContaining({path: 'student-profile-images/student-1/avatar'}),
    'file:///profile.jpg',
    {contentType: 'image/jpeg'},
  );
  expect(updateDoc).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({photoUrl: 'https://example.com/profile.jpg'}),
  );
});

it('rejects non-image or oversize files before uploading', async () => {
  await expect(
    uploadStudentProfilePhoto('student-1', {
      contentType: 'application/pdf',
      uri: 'file:///profile.pdf',
    }),
  ).rejects.toThrow('valid image');
  await expect(
    uploadStudentProfilePhoto('student-1', {
      contentType: 'image/jpeg',
      fileSize: MAX_PROFILE_PHOTO_BYTES + 1,
      uri: 'file:///large.jpg',
    }),
  ).rejects.toThrow('5 MB');

  expect(putFile).not.toHaveBeenCalled();
});
