import {createPinia, setActivePinia} from 'pinia';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useNotificationStore} from './notifications';

describe('notification store', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps success and failure mutually exclusive', () => {
    setActivePinia(createPinia());
    const store = useNotificationStore();
    store.success('Done');
    expect(store.message).toBe('Done');
    store.failure('Nope');
    expect(store.message).toBe('');
    expect(store.error).toBe('Nope');
    store.clear();
  });

  it('auto-dismisses a success notification after 3.8 seconds', () => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    const store = useNotificationStore();

    store.success('Scores saved.');
    vi.advanceTimersByTime(3799);
    expect(store.message).toBe('Scores saved.');
    vi.advanceTimersByTime(1);
    expect(store.message).toBe('');
  });

  it('replaces the current success and restarts its timeout', () => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    const store = useNotificationStore();

    store.success('First');
    vi.advanceTimersByTime(3000);
    store.success('Second');
    vi.advanceTimersByTime(1000);

    expect(store.message).toBe('Second');
    vi.advanceTimersByTime(2800);
    expect(store.message).toBe('');
  });
});
