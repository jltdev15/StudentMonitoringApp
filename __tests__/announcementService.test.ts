import {getDocs, updateDoc} from '@react-native-firebase/firestore';
import {
  getAnnouncementsForStudent,
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

it('returns student announcements newest first across general and class updates', async () => {
  (getDocs as jest.Mock)
    .mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            classId: null,
            createdAt: new Date('2026-07-01'),
            message: 'School-wide update',
            postedBy: 'teacher-1',
            targetRole: 'students',
            title: 'Older general update',
          }),
          id: 'older-general',
        },
      ],
    })
    .mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            classId: 'class-1',
            createdAt: new Date('2026-07-12'),
            message: 'Class update',
            postedBy: 'teacher-1',
            targetRole: 'students',
            title: 'Newest class update',
          }),
          id: 'newest-class',
        },
        {
          data: () => ({
            classId: 'class-1',
            message: 'Undated update',
            postedBy: 'teacher-1',
            targetRole: 'students',
            title: 'No date',
          }),
          id: 'undated-class',
        },
      ],
    });

  const announcements = await getAnnouncementsForStudent(['class-1']);

  expect(announcements.map(item => item.id)).toEqual([
    'newest-class',
    'older-general',
    'undated-class',
  ]);
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
