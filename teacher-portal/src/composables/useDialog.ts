import {ref} from 'vue';

export function useDialog<T extends string>() {
  const activeDialog = ref<T | null>(null);
  const open = (dialog: T) => { activeDialog.value = dialog; };
  const close = () => { activeDialog.value = null; };
  return {activeDialog, open, close};
}
