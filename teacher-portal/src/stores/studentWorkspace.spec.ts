import {createPinia, setActivePinia} from 'pinia';
import {beforeEach, vi} from 'vitest';
import {useStudentWorkspaceStore} from './studentWorkspace';

vi.mock('../services/students.service', () => ({getStudentRecordByUserId: vi.fn(async () => null)}));
vi.mock('../services/classes.service', () => ({getClassesByIds: vi.fn()}));
vi.mock('../services/activities.service', () => ({getStudentActivities: vi.fn()}));
vi.mock('../services/submissions.service', () => ({getStudentSubmissions: vi.fn()}));
vi.mock('../services/attendance.service', () => ({getStudentAttendanceRecords: vi.fn()}));
vi.mock('../services/announcements.service', () => ({getStudentAnnouncements: vi.fn()}));

describe('student workspace store', () => {
  beforeEach(() => setActivePinia(createPinia()));
  it('clears domain lists when no claimed roster record exists', async () => {
    const store = useStudentWorkspaceStore();
    await store.load('user-1');
    expect(store.student).toBeNull();
    expect(store.activities).toEqual([]);
    expect(store.loading).toBe(false);
  });
});
