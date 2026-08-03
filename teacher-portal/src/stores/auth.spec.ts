import {createPinia, setActivePinia} from 'pinia';
import {beforeEach, expect, vi} from 'vitest';
import {useAuthStore} from './auth';

const mocks = vi.hoisted(() => ({signOut: vi.fn(), getUserProfile: vi.fn()}));
vi.mock('../firebase', () => ({auth: {}}));
vi.mock('../services/auth.service', () => ({getUserProfile: mocks.getUserProfile}));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, next) => { next({uid: 'user-1'}); }),
  signOut: mocks.signOut,
}));

describe('authentication store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mocks.getUserProfile.mockResolvedValue({uid: 'user-1', role: 'teacher', status: 'active'});
    mocks.signOut.mockResolvedValue(undefined);
  });

  it('waits for authentication and loads the active profile', async () => {
    const store = useAuthStore();
    await store.initialize();
    expect(store.initialized).toBe(true);
    expect(store.role).toBe('teacher');
  });

  it('clears session state on logout', async () => {
    const store = useAuthStore();
    store.user = {uid: 'user-1'} as never;
    await store.logout();
    expect(mocks.signOut).toHaveBeenCalled();
    expect(store.user).toBeNull();
  });
});
