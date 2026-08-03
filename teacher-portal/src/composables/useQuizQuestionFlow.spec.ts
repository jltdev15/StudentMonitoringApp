import {describe, expect, it, vi} from 'vitest';
import {useQuizQuestionFlow} from './useQuizQuestionFlow';

describe('useQuizQuestionFlow', () => {
  it('only advances forward and resets to the first question', async () => {
    const flow = useQuizQuestionFlow();
    const focus = vi.fn();
    flow.questionCard.value = {focus} as unknown as HTMLElement;

    await expect(flow.advance(3)).resolves.toBe(true);
    expect(flow.currentQuestionIndex.value).toBe(1);
    await expect(flow.advance(3)).resolves.toBe(true);
    expect(flow.currentQuestionIndex.value).toBe(2);
    await expect(flow.advance(3)).resolves.toBe(false);
    expect(flow.currentQuestionIndex.value).toBe(2);
    expect(focus).toHaveBeenCalledTimes(2);

    flow.reset();
    expect(flow.currentQuestionIndex.value).toBe(0);
  });
});
