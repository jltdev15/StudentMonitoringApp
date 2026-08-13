import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getStudentAttendanceRecords} from './attendance.service';
import {getStudentSubmissions} from './submissions.service';
import {getTeacherStudentProfileRecords} from './teacherStudentProfile.service';

vi.mock('./attendance.service', () => ({getStudentAttendanceRecords: vi.fn()}));
vi.mock('./submissions.service', () => ({getStudentSubmissions: vi.fn()}));

describe('getTeacherStudentProfileRecords', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only records from the selected class', async () => {
    vi.mocked(getStudentAttendanceRecords).mockResolvedValue([
      {id: 'a1', classId: 'class-1', studentId: 'student-1', date: '2026-08-12', status: 'present', remarks: ''},
      {id: 'a2', classId: 'class-2', studentId: 'student-1', date: '2026-08-11', status: 'absent', remarks: ''},
    ]);
    vi.mocked(getStudentSubmissions).mockResolvedValue([
      {id: 's1', activityId: 'activity-1', classId: 'class-1', studentId: 'student-1', status: 'submitted', score: 20, remarks: ''},
      {id: 's2', activityId: 'activity-2', classId: 'class-2', studentId: 'student-1', status: 'submitted', score: 15, remarks: ''},
    ]);

    const result = await getTeacherStudentProfileRecords('student-1', 'class-1');
    expect(getStudentSubmissions).toHaveBeenCalledWith('student-1', ['class-1']);
    expect(result.attendance.map(item => item.id)).toEqual(['a1']);
    expect(result.submissions.map(item => item.id)).toEqual(['s1']);
  });
});
