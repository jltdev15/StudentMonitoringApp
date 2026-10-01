import {mount} from '@vue/test-utils';
import {describe, expect, it} from 'vitest';
import TeacherOverviewDashboard from './TeacherOverviewDashboard.vue';
import type {ActivityRecord, AttendanceStatus, ClassRecord, StudentRecord} from '../../types';

const classRecord: ClassRecord = {
  id: 'class-1',
  className: 'Grade 7 Mathematics',
  subject: 'Mathematics',
  gradeLevel: 'Grade 7',
  section: 'A',
  teacherId: 'teacher-1',
  schedule: 'Monday 09:00',
  status: 'active',
};

const students: StudentRecord[] = [
  {id: 'student-1', userId: null, studentNumber: 'S-001', fullName: 'Alex Rivera', email: '', contactNumber: '', guardianName: '', guardianContact: '', classIds: ['class-1'], status: 'active'},
  {id: 'student-2', userId: null, studentNumber: 'S-002', fullName: 'Bao Santos', email: '', contactNumber: '', guardianName: '', guardianContact: '', classIds: ['class-1'], status: 'active'},
  {id: 'student-3', userId: null, studentNumber: 'S-003', fullName: 'Cia Santos', email: '', contactNumber: '', guardianName: '', guardianContact: '', classIds: ['class-1'], status: 'active'},
];

const defaultSummary: Partial<Record<AttendanceStatus, number>> = {present: 0, late: 0, absent: 0, excused: 0};
const attendanceDateLabel = new Intl.DateTimeFormat(undefined, {month: 'long', day: 'numeric', year: 'numeric'}).format(new Date(2026, 8, 24));

type DashboardProps = {
  selectedClass?: ClassRecord | null;
  students?: StudentRecord[];
  activities?: ActivityRecord[];
  todaySummary?: Partial<Record<AttendanceStatus, number>>;
  attendanceDate?: string;
  unmarkedAttendanceCount?: number;
  busy?: boolean;
};

function activity(overrides: Partial<ActivityRecord> = {}): ActivityRecord {
  return {
    id: 'activity-1',
    classId: 'class-1',
    title: 'Build a balanced fraction',
    description: '',
    dueDate: new Date(2026, 8, 15, 12),
    totalPoints: 20,
    createdBy: 'teacher-1',
    activityCategory: 'peta',
    term: 'first',
    status: 'active',
    ...overrides,
  };
}

function mountDashboard(overrides: DashboardProps = {}) {
  return mount(TeacherOverviewDashboard, {
    props: {
      selectedClass: classRecord,
      students,
      activities: [],
      todaySummary: defaultSummary,
      attendanceDate: '2026-09-24',
      unmarkedAttendanceCount: 0,
      busy: false,
      ...overrides,
    },
  });
}

describe('TeacherOverviewDashboard', () => {
  it('renders class context, attendance metrics, and at most four open activities', () => {
    const wrapper = mountDashboard({
      todaySummary: {present: 2, late: 1, absent: 0, excused: 0},
      activities: [
        activity({id: 'activity-1', title: 'Fraction practice'}),
        activity({id: 'activity-2', title: 'Word problems', term: 'second'}),
        activity({id: 'activity-3', title: 'Peer explanation'}),
        activity({id: 'activity-4', title: 'Reflection journal'}),
        activity({id: 'activity-5', title: 'Fifth open task'}),
        activity({id: 'activity-closed', title: 'Closed task', status: 'closed'}),
      ],
    });

    expect(wrapper.get('#teacher-overview-title').text()).toBe('Grade 7 Mathematics');
    expect(wrapper.get('.overview-hero-summary').text()).toContain('3 learners enrolled');
    expect(wrapper.get('.overview-hero-summary').text()).toContain('Mathematics · Grade 7 · A');
    expect(wrapper.get('[data-metric="students"] strong').text()).toBe('3');
    expect(wrapper.get('[data-metric="present"] strong').text()).toBe('2');
    expect(wrapper.get('[data-metric="late"] strong').text()).toBe('1');
    expect(wrapper.get('[data-metric="absent"] strong').text()).toBe('0');
    expect(wrapper.get('[data-metric="present"]').text()).toContain(`on ${attendanceDateLabel}`);
    expect(wrapper.get('[data-metric="late"]').text()).toContain(`on ${attendanceDateLabel}`);
    expect(wrapper.get('[data-metric="absent"]').text()).toContain(`on ${attendanceDateLabel}`);

    const activityPanel = wrapper.get('.activities-panel');
    expect(activityPanel.get('h3').text()).toBe('Open activities');
    expect(activityPanel.findAll('li')).toHaveLength(4);
    expect(activityPanel.text()).not.toContain('Closed task');
    expect(activityPanel.findAll('.overview-day-badge')[0].text()).toBe('15');
    expect(activityPanel.text()).toContain('First term');
    expect(activityPanel.text()).toContain('Second term');
    expect(activityPanel.findAll('time').length).toBeGreaterThan(0);
  });

  it('shows the remaining unmarked attendance count with the selected date', () => {
    const wrapper = mountDashboard({unmarkedAttendanceCount: 2});

    expect(wrapper.get('.overview-attendance h3').text()).toBe('Attendance incomplete');
    expect(wrapper.get('.overview-attendance').text()).toContain(`2 learners still need a status on ${attendanceDateLabel}`);
    expect(wrapper.get('.overview-attendance').text()).not.toContain('today');
  });

  it('offers the first-class CTA and keeps announcement usable without a class', async () => {
    const wrapper = mountDashboard({selectedClass: null, students: [], unmarkedAttendanceCount: 0});

    const primaryCta = wrapper.get('.overview-hero-cta');
    expect(primaryCta.text()).toContain('Create your first class');
    expect(wrapper.get('[data-action="take-attendance"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-action="create-activity"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-action="add-student"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-action="post-announcement"]').attributes('disabled')).toBeUndefined();

    await primaryCta.trigger('click');
    expect(wrapper.emitted('create-class')).toHaveLength(1);
  });

  it('emits every workflow action and keeps activity navigation available', async () => {
    const wrapper = mountDashboard({todaySummary: {present: 1, late: 0, absent: 0, excused: 0}});

    for (const action of ['take-attendance', 'create-activity', 'add-student', 'post-announcement']) {
      await wrapper.get(`[data-action="${action}"]`).trigger('click');
    }
    await wrapper.get('.overview-view-all').trigger('click');

    expect(wrapper.emitted('take-attendance')).toHaveLength(1);
    expect(wrapper.emitted('create-activity')).toHaveLength(1);
    expect(wrapper.emitted('add-student')).toHaveLength(1);
    expect(wrapper.emitted('post-announcement')).toHaveLength(1);
    expect(wrapper.emitted('go-activities')).toHaveLength(1);
  });

  it('renders a stable empty badge and a useful message when an activity has no due date', () => {
    const wrapper = mountDashboard({activities: [activity({dueDate: null, term: undefined})]});
    const activityPanel = wrapper.get('.activities-panel');

    expect(activityPanel.get('.overview-day-badge').text()).toBe('—');
    expect(activityPanel.text()).toContain('No due date');
    expect(activityPanel.text()).toContain('Unassigned');
    expect(activityPanel.find('time').exists()).toBe(false);
  });
});
