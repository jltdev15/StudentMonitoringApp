import {createPinia, setActivePinia} from 'pinia';
import {useNotificationStore} from './notifications';

describe('notification store', () => {
  beforeEach(() => setActivePinia(createPinia()));
  it('keeps success and failure mutually exclusive', () => {
    const store = useNotificationStore();
    store.success('Done');
    expect(store.message).toBe('Done');
    store.failure('Nope');
    expect(store.message).toBe('');
    expect(store.error).toBe('Nope');
  });
});
