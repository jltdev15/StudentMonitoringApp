import {describe, expect, it} from 'vitest';
import {routes} from './index';

describe('portal routes', () => {
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
});
