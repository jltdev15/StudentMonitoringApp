import {createPinia, setActivePinia} from 'pinia';
import {beforeEach, expect, it, vi} from 'vitest';
import {getClassesByIds} from '../services/classes.service';
import {getStudentRecordByUserId} from '../services/students.service';
import {getStudentSubmissions} from '../services/submissions.service';
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

  it('loads submissions only within the student’s enrolled classes', async () => {
    vi.mocked(getStudentRecordByUserId).mockResolvedValue({id: 'student-1', classIds: ['class-1']} as never);
    vi.mocked(getClassesByIds).mockResolvedValue([{id: 'class-1'}] as never);
    const store = useStudentWorkspaceStore();

    await store.load('user-1');

    expect(getStudentSubmissions).toHaveBeenCalledWith('student-1', ['class-1']);
  });
});
