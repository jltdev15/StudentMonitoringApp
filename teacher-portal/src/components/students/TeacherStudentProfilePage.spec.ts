import {mount} from '@vue/test-utils';
import {describe, expect, it} from 'vitest';
import type {ClassRecord, StudentRecord} from '../../types';
import TeacherStudentProfilePage from './TeacherStudentProfilePage.vue';

const student: StudentRecord = {id: 'student-1', userId: null, studentNumber: '261132', fullName: 'AGUSTIN, DWAYNE XYRUZ N.', email: 'student@example.com', contactNumber: '', guardianName: '', guardianContact: '', classIds: ['class-1'], status: 'active'};
const classRecord: ClassRecord = {id: 'class-1', className: 'Grade 11 ICT', subject: 'Programming', gradeLevel: '11', section: 'GC1MA', teacherId: 'teacher-1', schedule: '', status: 'active'};

describe('TeacherStudentProfilePage', () => {
  it('renders identity, class attendance totals, and missing activity scores', () => {
    const wrapper = mount(TeacherStudentProfilePage, {props: {
      student, classRecord,
      attendance: [{id: 'a1', classId: 'class-1', studentId: 'student-1', date: '2026-08-12', status: 'present', remarks: ''}],
      activities: [{id: 'activity-1', classId: 'class-1', title: 'Quiz 1', description: '', dueDate: null, totalPoints: 25, createdBy: 'teacher-1', activityCategory: 'quiz', status: 'active'}],
      submissions: [],
    }});
    expect(wrapper.text()).toContain('AGUSTIN, DWAYNE XYRUZ N.');
    expect(wrapper.text()).toContain('Grade 11 ICT');
    expect(wrapper.text()).toContain('Quiz 1');
    expect(wrapper.text()).toContain('Missing');
    expect(wrapper.find('.teacher-profile-attendance-stats .present strong').text()).toBe('1');
  });

  it('emits back from the back action', async () => {
    const wrapper = mount(TeacherStudentProfilePage, {props: {student, classRecord, attendance: [], activities: [], submissions: []}});
    await wrapper.get('.teacher-profile-back').trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
  });
});
