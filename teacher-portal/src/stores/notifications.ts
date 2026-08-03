import {defineStore} from 'pinia';
import {ref} from 'vue';

export const useNotificationStore = defineStore('notifications', () => {
  const message = ref('');
  const error = ref('');
  let timer: number | undefined;

  function success(value: string) {
    window.clearTimeout(timer);
    error.value = '';
    message.value = value;
    timer = window.setTimeout(() => { message.value = ''; }, 3800);
  }

  function failure(value: string) {
    window.clearTimeout(timer);
    message.value = '';
    error.value = value;
  }

  function clear() {
    window.clearTimeout(timer);
    message.value = '';
    error.value = '';
  }

  return {message, error, success, failure, clear};
});
