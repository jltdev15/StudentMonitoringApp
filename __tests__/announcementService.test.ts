import {getDocs, updateDoc} from '@react-native-firebase/firestore';
import {
  getTeacherAnnouncements,
  updateAnnouncement,
} from '../src/services/announcementService';

beforeEach(() => {
  jest.clearAllMocks();
});

it('returns a teacher announcement history newest first', async () => {
  (getDocs as jest.Mock).mockResolvedValue({
    docs: [
      {
        data: () => ({
          classId: null,
          createdAt: new Date('2026-07-01'),
          message: 'Older update',
          postedBy: 'teacher-1',
          targetRole: 'students',
          title: 'Older',
        }),
        id: 'older',
      },
      {
        data: () => ({
          classId: 'class-1',
          createdAt: new Date('2026-07-12'),
          message: 'Newer update',
          postedBy: 'teacher-1',
          targetRole: 'students',
          title: 'Newer',
        }),
        id: 'newer',
      },
    ],
  });

  const announcements = await getTeacherAnnouncements('teacher-1');

  expect(announcements.map(item => item.id)).toEqual(['newer', 'older']);
});

it('updates only editable announcement fields', async () => {
  await updateAnnouncement('announcement-1', {
    message: 'Corrected message',
    title: 'Corrected title',
  });

  expect(updateDoc).toHaveBeenCalledWith(
    {id: 'document'},
    expect.objectContaining({
      message: 'Corrected message',
      title: 'Corrected title',
      updatedAt: expect.any(Date),
    }),
  );
});
