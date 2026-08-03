import {createPinia, setActivePinia} from 'pinia';
import {beforeEach, vi} from 'vitest';
import {useTeacherWorkspaceStore} from './teacherWorkspace';

vi.mock('../services/classes.service', () => ({getTeacherClasses: vi.fn(async () => [{id: 'class-1', className: 'ICT'}])}));
vi.mock('../services/students.service', () => ({getStudentsByClass: vi.fn(async () => [])}));
vi.mock('../services/activities.service', () => ({getActivities: vi.fn(async () => [])}));
vi.mock('../services/attendance.service', () => ({getAttendance: vi.fn(async () => [])}));

describe('teacher workspace store', () => {
  beforeEach(() => setActivePinia(createPinia()));
  it('falls back to the first class when a query class is invalid', async () => {
    const store = useTeacherWorkspaceStore();
    await store.load('teacher-1', 'missing');
    expect(store.selectedClassId).toBe('class-1');
    expect(store.loading).toBe(false);
  });
});
