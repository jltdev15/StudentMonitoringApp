import {getDocs, where} from '@react-native-firebase/firestore';
import {findRosterStudent} from '../src/services/studentService';

beforeEach(() => {
  jest.clearAllMocks();
});

it('finds a legacy roster record whose unclaimed userId is an empty string', async () => {
  (getDocs as jest.Mock)
    .mockResolvedValueOnce({docs: [], empty: true})
    .mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => ({
            fullName: 'GESMUNDO, ARON PAUL P.',
            status: 'active',
            studentNumber: '261105',
            userId: '',
          }),
          id: 'student-1',
        },
      ],
    });

  await expect(findRosterStudent(' 261105 ')).resolves.toMatchObject({
    fullName: 'GESMUNDO, ARON PAUL P.',
    id: 'student-1',
    studentNumber: '261105',
  });

  expect(where).toHaveBeenCalledWith('userId', '==', null);
  expect(where).toHaveBeenCalledWith('userId', '==', '');
});
