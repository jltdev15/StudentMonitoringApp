import {getDocs, setDoc} from '@react-native-firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  putFile,
} from '@react-native-firebase/storage';
import {
  createActivity,
  getActivitySubmission,
  MAX_SUBMISSION_IMAGES,
  submitImageActivity,
} from '../src/services/activityService';
import {ActivityRecord} from '../src/types/models';

const mockActivity: ActivityRecord = {
  id: 'activity-1',
  classId: 'class-1',
  title: 'Photo output',
  description: '',
  dueDate: new Date(Date.now() + 60 * 60 * 1000),
  totalPoints: 100,
  createdBy: 'teacher-1',
  acceptsImageAttachments: true,
  status: 'active',
};

beforeEach(() => {
  jest.clearAllMocks();
  (getDocs as jest.Mock).mockResolvedValue({docs: []});
  (setDoc as jest.Mock).mockResolvedValue(undefined);
  (putFile as jest.Mock).mockResolvedValue(undefined);
  (getDownloadURL as jest.Mock).mockResolvedValue(
    'https://example.com/submission.jpg',
  );
});

it('stores image submission support as disabled by default', async () => {
  await createActivity({
    classId: 'class-1',
    title: 'Existing-style activity',
    description: '',
    dueDate: new Date(),
    totalPoints: 10,
    createdBy: 'teacher-1',
  });

  expect(setDoc).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({acceptsImageAttachments: false}),
  );
});

it('returns no submission when the student has not submitted the activity', async () => {
  await expect(getActivitySubmission('activity-1', 'student-1')).resolves.toBe(
    null,
  );
});

it('rejects more than the maximum image count before uploading', async () => {
  const images = Array.from(
    {length: MAX_SUBMISSION_IMAGES + 1},
    (_, index) => ({
      uri: `file:///image-${index}.jpg`,
      fileName: `image-${index}.jpg`,
      contentType: 'image/jpeg',
    }),
  );

  await expect(
    submitImageActivity(mockActivity, 'student-1', images),
  ).rejects.toThrow(`up to ${MAX_SUBMISSION_IMAGES} images`);
  expect(putFile).not.toHaveBeenCalled();
});

it('rejects replacement after the teacher has scored the submission', async () => {
  (getDocs as jest.Mock).mockResolvedValue({
    docs: [
      {
        id: 'activity-1_student-1',
        data: () => ({
          activityId: 'activity-1',
          classId: 'class-1',
          studentId: 'student-1',
          status: 'submitted',
          score: 90,
          remarks: 'Checked',
          checkedBy: 'teacher-1',
          submittedAt: new Date(),
        }),
      },
    ],
  });

  await expect(
    submitImageActivity(mockActivity, 'student-1', [
      {
        uri: 'file:///replacement.jpg',
        fileName: 'replacement.jpg',
        contentType: 'image/jpeg',
      },
    ]),
  ).rejects.toThrow('already been scored');

  expect(putFile).not.toHaveBeenCalled();
});

it('uploads selected images and persists attachment metadata', async () => {
  const result = await submitImageActivity(mockActivity, 'student-1', [
    {
      uri: 'file:///output.jpg',
      fileName: 'output.jpg',
      contentType: 'image/jpeg',
      fileSize: 1024,
    },
  ]);

  expect(putFile).toHaveBeenCalledWith(
    expect.anything(),
    'file:///output.jpg',
    expect.objectContaining({contentType: 'image/jpeg'}),
  );
  expect(result.attachments).toHaveLength(1);
  expect(setDoc).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      attachments: expect.arrayContaining([
        expect.objectContaining({
          downloadUrl: 'https://example.com/submission.jpg',
          fileName: 'output.jpg',
        }),
      ]),
      status: 'submitted',
    }),
    {merge: true},
  );
});

it('removes uploaded files when a later image upload fails', async () => {
  (putFile as jest.Mock)
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error('Upload failed'));

  await expect(
    submitImageActivity(mockActivity, 'student-1', [
      {
        uri: 'file:///first.jpg',
        fileName: 'first.jpg',
        contentType: 'image/jpeg',
      },
      {
        uri: 'file:///second.jpg',
        fileName: 'second.jpg',
        contentType: 'image/jpeg',
      },
    ]),
  ).rejects.toThrow('Upload failed');

  expect(deleteObject).toHaveBeenCalledTimes(1);
  expect(setDoc).not.toHaveBeenCalled();
});
