import {createApp} from 'vue';
import {createPinia} from 'pinia';
import App from './App.vue';
import {router} from './router';
import './styles.css';

/**
 * Older local portal builds registered a broad service worker. It can intercept
 * Firestore's WebChannel requests and reject them as normal page fetches. The
 * portal does not ship a service worker, so remove those stale registrations
 * while developing on localhost before mounting the application.
 */
const removeLegacyDevelopmentServiceWorkers = async () => {
  if (!import.meta.env.DEV || !('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (!registrations.length) return;

  await Promise.all(registrations.map(registration => registration.unregister()));

  // A controller remains active for the current document after unregistering.
  // Reload once so future Firestore requests are no longer routed through it.
  const reloadKey = 'portal:removed-legacy-service-worker';
  if (!sessionStorage.getItem(reloadKey)) {
    sessionStorage.setItem(reloadKey, 'true');
    window.location.reload();
  }
};

void removeLegacyDevelopmentServiceWorkers();

createApp(App).use(createPinia()).use(router).mount('#app');
