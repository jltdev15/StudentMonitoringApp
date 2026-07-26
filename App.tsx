import React, {useCallback, useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {LoadingState} from './src/components/LoadingState';
import {AuthProvider} from './src/context/AuthContext';
import {RootNavigator} from './src/navigation/RootNavigator';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {requestAnnouncementNotificationPermission} from './src/services/notificationPermissionService';
import {
  completeOnboarding,
  hasCompletedOnboarding,
} from './src/services/onboardingService';
import {appTheme} from './src/utils/theme';

const AppContent = () => {
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    hasCompletedOnboarding()
      .then(value => {
        if (isMounted) {
          setHasCompletedWelcome(value);
        }
      })
      .catch(error => {
        console.warn('Could not read onboarding status:', error);
        if (isMounted) {
          setHasCompletedWelcome(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCompleteOnboarding = useCallback(async () => {
    try {
      await completeOnboarding();
    } catch (error) {
      console.warn('Could not save onboarding status:', error);
    } finally {
      setHasCompletedWelcome(true);
    }
  }, []);

  if (hasCompletedWelcome === null) {
    return <LoadingState label="Preparing your classroom..." />;
  }

  if (!hasCompletedWelcome) {
    return (
      <OnboardingScreen
        onComplete={handleCompleteOnboarding}
        requestNotificationPermission={requestAnnouncementNotificationPermission}
      />
    );
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={appTheme.colors.background}
        />
        <AppContent />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default App;
