import {createPinia} from 'pinia';
import {flushPromises, mount} from '@vue/test-utils';
import {vi} from 'vitest';
import PortalApplication from './PortalApplication.vue';

const mocks = vi.hoisted(() => ({
  route: {name: 'login', path: '/login', meta: {public: true}, query: {}, params: {}},
  router: {push: vi.fn(), replace: vi.fn()},
}));
vi.mock('vue-router', () => ({useRoute: () => mocks.route, useRouter: () => mocks.router}));
vi.mock('../firebase', () => ({auth: {currentUser: null}, functions: {}, isFirebaseConfigured: true}));
vi.mock('firebase/functions', () => ({httpsCallable: vi.fn(() => vi.fn())}));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => { callback(null); return vi.fn(); }),
  createUserWithEmailAndPassword: vi.fn(), sendEmailVerification: vi.fn(), signInWithEmailAndPassword: vi.fn(), signOut: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({Timestamp: {fromDate: vi.fn()}}));

vi.mock('../services/auth.service', () => ({
  getUserProfile: vi.fn(), createStudentUserProfile: vi.fn(), requestPasswordReset: vi.fn(),
  verifyPasswordReset: vi.fn(), completePasswordReset: vi.fn(),
}));
vi.mock('../services/classes.service', () => ({getClassesByIds: vi.fn(async () => []), getTeacherClasses: vi.fn(async () => []), saveClass: vi.fn()}));
vi.mock('../services/students.service', () => ({archiveStudent: vi.fn(), claimRosterStudent: vi.fn(), findRosterStudent: vi.fn(), getStudentRecordByUserId: vi.fn(), getStudentsByClass: vi.fn(async () => []), saveStudent: vi.fn()}));
vi.mock('../services/attendance.service', () => ({getAttendance: vi.fn(async () => []), getStudentAttendanceRecords: vi.fn(async () => []), saveAttendance: vi.fn()}));
vi.mock('../services/activities.service', () => ({closeActivity: vi.fn(), getActivities: vi.fn(async () => []), getStudentActivities: vi.fn(async () => []), removeActivityMaterial: vi.fn(), reopenActivity: vi.fn(), saveActivity: vi.fn(), updateActivityDueDate: vi.fn(), uploadActivityMaterials: vi.fn(async () => [])}));
vi.mock('../services/announcements.service', () => ({deleteAnnouncement: vi.fn(), getAnnouncements: vi.fn(async () => []), getStudentAnnouncements: vi.fn(async () => []), saveAnnouncement: vi.fn(), setAnnouncementFeatured: vi.fn()}));
vi.mock('../services/submissions.service', () => ({getStudentSubmissions: vi.fn(async () => []), getSubmissions: vi.fn(async () => []), saveScores: vi.fn(), submitStudentQuiz: vi.fn()}));
vi.mock('../services/administration.service', () => ({backfillStudentFeed: vi.fn(), resetTeacherData: vi.fn()}));
vi.mock('../services/teacherStudentProfile.service', () => ({getTeacherStudentProfileRecords: vi.fn(async () => ({attendance: [], submissions: []}))}));

describe('PortalApplication', () => {
  it('renders the sign-in state after authentication initializes', async () => {
    const wrapper = mount(PortalApplication, {global: {plugins: [createPinia()]}});
    await flushPromises();
    expect(wrapper.get('h2').text()).toBe('Welcome back');
    expect(wrapper.get('button.primary').text()).toBe('Sign in');
  });

  it('opens the password-reset request with the entered email', async () => {
    const wrapper = mount(PortalApplication, {global: {plugins: [createPinia()]}});
    await flushPromises();
    await wrapper.get('input[type="email"]').setValue('learner@school.edu');
    await wrapper.get('button.auth-link-inline').trigger('click');
    expect(mocks.router.push).toHaveBeenCalledWith({path: '/forgot-password', query: {email: 'learner@school.edu'}});
  });
});
