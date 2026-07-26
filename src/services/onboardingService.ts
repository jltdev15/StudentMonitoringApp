import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'class-tracker:onboarding-completed:v1';

export const hasCompletedOnboarding = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
  return value === 'true';
};

export const completeOnboarding = async (): Promise<void> => {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
};
