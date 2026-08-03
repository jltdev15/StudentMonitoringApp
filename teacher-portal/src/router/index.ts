import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router';
import {useAuthStore} from '../stores/auth';
import {resolveRouteAccess} from './accessPolicy';

const portal = () => import('../app/PortalApplication.vue');
export const routes: RouteRecordRaw[] = [
  {path: '/', redirect: '/login'},
  {path: '/login', name: 'login', component: portal, meta: {public: true}},
  {path: '/register/verify', name: 'register-verify', component: portal, meta: {public: true}},
  {path: '/register/account', name: 'register-account', component: portal, meta: {public: true}},
  {path: '/verify-email', name: 'verify-email', component: portal, meta: {public: true}},
  {path: '/admin', redirect: '/admin/overview'},
  {path: '/admin/overview', name: 'admin-overview', component: portal, meta: {role: 'teacher', view: 'dashboard'}},
  {path: '/admin/classes', name: 'admin-classes', component: portal, meta: {role: 'teacher', view: 'classes'}},
  {path: '/admin/students', name: 'admin-students', component: portal, meta: {role: 'teacher', view: 'students'}},
  {path: '/admin/attendance', name: 'admin-attendance', component: portal, meta: {role: 'teacher', view: 'attendance'}},
  {path: '/admin/activities', name: 'admin-activities', component: portal, meta: {role: 'teacher', view: 'activities'}},
  {path: '/admin/announcements', name: 'admin-announcements', component: portal, meta: {role: 'teacher', view: 'announcements'}},
  {path: '/admin/reports', name: 'admin-reports', component: portal, meta: {role: 'teacher', view: 'reports'}},
  {path: '/admin/utilities', name: 'admin-utilities', component: portal, meta: {role: 'teacher', view: 'utilities'}},
  {path: '/student', redirect: '/student/overview'},
  {path: '/student/overview', name: 'student-overview', component: portal, meta: {role: 'student', view: 'dashboard'}},
  {path: '/student/classes', name: 'student-classes', component: portal, meta: {role: 'student', view: 'classes'}},
  {path: '/student/activities', name: 'student-activities', component: portal, meta: {role: 'student', view: 'activities'}},
  {path: '/student/attendance', name: 'student-attendance', component: portal, meta: {role: 'student', view: 'attendance'}},
  {path: '/student/announcements', name: 'student-announcements', component: portal, meta: {role: 'student', view: 'announcements'}},
  {path: '/student/profile', name: 'student-profile', component: portal, meta: {role: 'student', view: 'profile'}},
  {path: '/student/activities/:activityId/take', name: 'student-take-quiz', component: portal, meta: {role: 'student', view: 'take-quiz'}},
  {path: '/student/activities/:activityId/review', name: 'student-review-quiz', component: portal, meta: {role: 'student', view: 'review-quiz'}},
  {path: '/:pathMatch(.*)*', redirect: '/login'},
];

export const router = createRouter({history: createWebHistory(), routes, scrollBehavior: () => ({top: 0})});

router.beforeEach(async to => {
  const authStore = useAuthStore();
  await authStore.initialize();
  return resolveRouteAccess(to, {user: authStore.user, role: authStore.role, active: authStore.isActive});
});
