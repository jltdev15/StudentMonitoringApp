<script setup lang="ts">
import {storeToRefs} from 'pinia';
import {useNotificationStore} from '../../stores/notifications';

const notifications = useNotificationStore();
const {message, error} = storeToRefs(notifications);
</script>

<template>
  <div class="global-feedback" aria-live="polite" aria-atomic="true">
    <Transition name="toast">
      <div v-if="message" class="feedback-toast success" role="status">
        <span class="feedback-icon material-symbols-outlined" aria-hidden="true">check_circle</span>
        <span class="feedback-message">{{ message }}</span>
        <button type="button" aria-label="Dismiss notification" @click="notifications.clear">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
    </Transition>
    <Transition name="toast">
      <div v-if="error" class="feedback-toast error" role="alert">
        <span class="feedback-icon material-symbols-outlined" aria-hidden="true">error</span>
        <span class="feedback-message">{{ error }}</span>
        <button type="button" aria-label="Dismiss notification" @click="notifications.clear">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.global-feedback {
  position: fixed;
  z-index: 300;
  top: max(18px, env(safe-area-inset-top));
  left: 50%;
  width: min(calc(100vw - 32px), 440px);
  transform: translateX(-50%);
  pointer-events: none;
}
.feedback-toast {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 8px 8px 8px 12px;
  color: #1d2b43;
  background: rgba(255, 255, 255, .97);
  border: 1px solid rgba(200, 211, 228, .9);
  border-radius: 16px;
  box-shadow: 0 18px 48px rgba(25, 39, 66, .16), 0 3px 10px rgba(25, 39, 66, .08);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}
.feedback-toast.success { border-color: #ccebdc; }
.feedback-toast.error { border-color: #f1ccd1; }
.feedback-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #118653;
  background: #e8f8f0;
  border-radius: 11px;
  font-size: 21px;
  font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20;
}
.feedback-toast.error .feedback-icon { color: #c63140; background: #fff0f2; }
.feedback-message { min-width: 0; font-size: 13px; font-weight: 750; line-height: 1.45; letter-spacing: -.01em; overflow-wrap: anywhere; }
.feedback-toast button {
  display: grid;
  width: 40px;
  height: 40px;
  padding: 0;
  place-items: center;
  color: #66758f;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
}
.feedback-toast button:hover { background: #eef3fa; color: #263550; }
.feedback-toast button:focus-visible { outline: 3px solid rgba(43, 98, 220, .28); outline-offset: 1px; }
.feedback-toast button span { font-size: 20px; }
.toast-enter-active { transition: opacity .22s ease, transform .22s cubic-bezier(.2, .8, .2, 1); }
.toast-leave-active { transition: opacity .16s ease, transform .16s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px) scale(.97); }
@media (max-width: 760px) {
  .global-feedback {
    top: calc(68px + env(safe-area-inset-top));
    width: min(calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right)), 440px);
  }
  .feedback-toast { grid-template-columns: 36px minmax(0, 1fr) 40px; min-height: 60px; gap: 10px; }
  .feedback-icon { width: 36px; height: 36px; }
}
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: none; }
}
</style>
