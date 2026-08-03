import {nextTick, ref} from 'vue';

export function useQuizQuestionFlow() {
  const currentQuestionIndex = ref(0);
  const questionCard = ref<HTMLElement | null>(null);

  function reset() {
    currentQuestionIndex.value = 0;
  }

  async function advance(totalQuestions: number) {
    if (currentQuestionIndex.value >= Math.max(totalQuestions - 1, 0)) return false;
    currentQuestionIndex.value += 1;
    await nextTick();
    questionCard.value?.focus();
    return true;
  }

  return {currentQuestionIndex, questionCard, reset, advance};
}
