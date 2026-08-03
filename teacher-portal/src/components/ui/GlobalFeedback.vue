<script setup lang="ts">
import {storeToRefs} from 'pinia';
import {useNotificationStore} from '../../stores/notifications';

const notifications = useNotificationStore();
const {message, error} = storeToRefs(notifications);
</script>

<template>
  <div class="global-feedback" aria-live="polite" aria-atomic="true">
    <p v-if="message" class="alert success">{{ message }}</p>
    <p v-if="error" class="alert error">{{ error }}</p>
  </div>
</template>

<style scoped>
.global-feedback { position: fixed; z-index: 100; top: 14px; left: 50%; width: min(92vw, 560px); transform: translateX(-50%); pointer-events: none; }
.global-feedback .alert { margin: 0; box-shadow: 0 8px 28px rgba(24, 35, 57, .14); }
</style>
