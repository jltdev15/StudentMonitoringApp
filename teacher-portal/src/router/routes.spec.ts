import {describe, expect, it} from 'vitest';
import {routes} from './index';

describe('portal routes', () => {
  it('registers branded public password-reset routes', () => {
    expect(routes.find(route => route.path === '/forgot-password')).toMatchObject({name: 'forgot-password', meta: {public: true}});
    expect(routes.find(route => route.path === '/reset-password')).toMatchObject({name: 'reset-password', meta: {public: true}});
  });

  it('uses the feed as the student landing page and redirects the legacy overview URL', () => {
    expect(routes.find(route => route.path === '/student')).toMatchObject({redirect: '/student/feed'});
    expect(routes.find(route => route.path === '/student/overview')).toMatchObject({redirect: '/student/feed'});
  });

  it('registers the student feed as a protected student route', () => {
    const feed = routes.find(route => route.path === '/student/feed');
    expect(feed).toMatchObject({
      name: 'student-feed',
      meta: {role: 'student', view: 'feed'},
    });
  });

  it('registers the teacher feed while keeping overview as the teacher landing page', () => {
    expect(routes.find(route => route.path === '/admin')).toMatchObject({redirect: '/admin/overview'});
    expect(routes.find(route => route.path === '/admin/feed')).toMatchObject({
      name: 'admin-feed', meta: {role: 'teacher', view: 'feed'},
    });
  });

  it('registers a protected teacher-facing student profile route', () => {
    expect(routes.find(route => route.path === '/admin/students/:studentId')).toMatchObject({
      name: 'admin-student-profile', meta: {role: 'teacher', view: 'student-profile'},
    });
  });
});
