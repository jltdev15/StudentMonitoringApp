import type {RouteLocationNormalized} from 'vue-router';

export type AccessState = {user: unknown | null; role: 'teacher' | 'student' | null; active: boolean};

export function landingPage(role: AccessState['role']) {
  return role === 'teacher' ? '/admin/overview' : role === 'student' ? '/student/overview' : '/login';
}

export function resolveRouteAccess(to: Pick<RouteLocationNormalized, 'fullPath' | 'meta'>, state: AccessState) {
  const requiredRole = to.meta.role as AccessState['role'] | undefined;
  if (to.meta.public) return state.active && state.role ? landingPage(state.role) : true;
  if (!state.user || !state.active || !state.role) return {path: '/login', query: {redirect: to.fullPath}};
  if (requiredRole && state.role !== requiredRole) return landingPage(state.role);
  return true;
}
