import {defineStore} from 'pinia';
import {onAuthStateChanged, signOut, type User} from 'firebase/auth';
import {auth} from '../firebase';
import {getUserProfile} from '../services/auth.service';
import type {UserProfile} from '../types';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    profile: null as UserProfile | null,
    initialized: false,
    initialization: null as Promise<void> | null,
  }),
  getters: {
    role: state => state.profile?.role ?? null,
    isActive: state => state.profile?.status === 'active',
  },
  actions: {
    initialize() {
      if (this.initialized) return Promise.resolve();
      if (this.initialization) return this.initialization;
      this.initialization = new Promise<void>(resolve => {
        let firstEmission = true;
        onAuthStateChanged(auth, async user => {
          try {
            this.user = user;
            this.profile = user ? await getUserProfile(user.uid) : null;
          } catch {
            this.user = null;
            this.profile = null;
          } finally {
            this.initialized = true;
            this.initialization = null;
            if (firstEmission) {
              firstEmission = false;
              resolve();
            }
          }
        }, () => {
          this.user = null;
          this.profile = null;
          this.initialized = true;
          this.initialization = null;
          if (firstEmission) {
            firstEmission = false;
            resolve();
          }
        });
      });
      return this.initialization;
    },
    async logout() {
      await signOut(auth);
      this.user = null;
      this.profile = null;
    },
  },
});
