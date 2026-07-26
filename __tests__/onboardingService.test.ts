import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  completeOnboarding,
  hasCompletedOnboarding,
} from '../src/services/onboardingService';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
});

it('treats a missing completion key as incomplete onboarding', async () => {
  storage.getItem.mockResolvedValue(null);

  await expect(hasCompletedOnboarding()).resolves.toBe(false);
});

it('stores completion using the versioned onboarding key', async () => {
  await completeOnboarding();

  expect(storage.setItem).toHaveBeenCalledWith(
    'class-tracker:onboarding-completed:v1',
    'true',
  );
});
