import {resolveRouteAccess} from './accessPolicy';

const to = (fullPath: string, meta: Record<string, unknown>) => ({fullPath, meta});

describe('route access policy', () => {
  it('preserves a protected deep link for sign in', () => {
    expect(resolveRouteAccess(to('/admin/activities?class=one', {role: 'teacher'}) as never, {user: null, role: null, active: false}))
      .toEqual({path: '/login', query: {redirect: '/admin/activities?class=one'}});
  });
  it('redirects wrong-role users to their own portal', () => {
    expect(resolveRouteAccess(to('/admin/classes', {role: 'teacher'}) as never, {user: {}, role: 'student', active: true})).toBe('/student/feed');
  });
  it('redirects authenticated users away from login', () => {
    expect(resolveRouteAccess(to('/login', {public: true}) as never, {user: {}, role: 'teacher', active: true})).toBe('/admin/overview');
  });
});
