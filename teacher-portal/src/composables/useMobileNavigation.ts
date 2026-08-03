import {nextTick, onBeforeUnmount, ref, watch} from 'vue';

export function useMobileNavigation() {
  const isOpen = ref(false);
  const trigger = ref<HTMLButtonElement | null>(null);
  const closeButton = ref<HTMLButtonElement | null>(null);
  const open = () => { isOpen.value = true; nextTick(() => closeButton.value?.focus()); };
  const close = (returnFocus = true) => {
    isOpen.value = false;
    if (returnFocus) nextTick(() => trigger.value?.focus());
  };
  const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
  watch(isOpen, value => { document.body.style.overflow = value ? 'hidden' : ''; });
  window.addEventListener('keydown', onKeydown);
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
  });
  return {isOpen, trigger, closeButton, open, close};
}
