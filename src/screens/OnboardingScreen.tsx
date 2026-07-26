import React, {useCallback, useRef, useState} from 'react';
import {
  Image,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from 'react-native-paper';

const schoolBackground = require('../assets/images/onboarding-bg.webp');
const notificationBackground = require('../assets/images/onboarding-notifications-bg.png');
const supportShield = require('../assets/images/onboarding-support-shield.png');

type Props = {
  onComplete: () => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
};

const pageCount = 3;

export const OnboardingScreen = ({
  onComplete,
  requestNotificationPermission,
}: Props) => {
  const {height, width} = useWindowDimensions();
  const carouselRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const isCompact = height < 720;
  const isNarrow = width < 360;
  const isBusy = isCompleting || isRequestingPermission;

  const goToPage = useCallback(
    (nextPage: number) => {
      const safePage = Math.max(0, Math.min(nextPage, pageCount - 1));
      carouselRef.current?.scrollTo({animated: true, x: safePage * width});
      setPageIndex(safePage);
    },
    [width],
  );

  const handleComplete = useCallback(async () => {
    if (isBusy) {
      return;
    }

    setIsCompleting(true);
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  }, [isBusy, onComplete]);

  const handleEnableNotifications = useCallback(async () => {
    if (isBusy) {
      return;
    }

    setIsRequestingPermission(true);
    try {
      await requestNotificationPermission();
    } catch (error) {
      console.warn('Notification permission request failed:', error);
    } finally {
      setIsRequestingPermission(false);
      goToPage(2);
    }
  }, [goToPage, isBusy, requestNotificationPermission]);

  const handlePageMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
      setPageIndex(Math.max(0, Math.min(nextPage, pageCount - 1)));
    },
    [width],
  );

  const pageStyle = {width};
  const contentStyle = [
    styles.content,
    isCompact && styles.contentCompact,
    isNarrow && styles.contentNarrow,
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={schoolBackground}
        style={styles.background}>
        <Pressable
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
          disabled={isBusy}
          hitSlop={12}
          onPress={handleComplete}
          style={({pressed}) => [
            styles.skipButton,
            (pressed || isBusy) && styles.buttonPressed,
          ]}>
          <Text style={styles.skipLabel}>Skip</Text>
        </Pressable>

        <ScrollView
          accessibilityLabel="Onboarding carousel"
          horizontal
          onMomentumScrollEnd={handlePageMomentumEnd}
          pagingEnabled
          ref={carouselRef}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}>
          <View style={[styles.page, pageStyle]}>
            <View
              accessibilityLabel="Welcome to Your School"
              style={[contentStyle, styles.welcomeContent]}>
              <Text
                style={[
                  styles.title,
                  styles.welcomeTitle,
                  isNarrow && styles.titleNarrow,
                ]}>
                Welcome to
              </Text>
              <Text
                style={[
                  styles.title,
                  styles.titleAccent,
                  styles.welcomeTitle,
                  isNarrow && styles.titleNarrow,
                ]}>
                Your School
              </Text>
              <Text
                style={[
                  styles.description,
                  styles.welcomeDescription,
                  isNarrow && styles.descriptionNarrow,
                ]}>
                Your all-in-one app for updates,{`\n`}attendance, activities,
                and more.{`\n`}Stay connected. Stay informed.
              </Text>

              <PrimaryButton
                accessibilityLabel="Continue to notifications"
                onPress={() => goToPage(1)}>
                Get Started
              </PrimaryButton>
            </View>
          </View>

          <View style={[styles.page, pageStyle]}>
            <ImageBackground
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={notificationBackground}
              style={styles.notificationBackground}
            />
            <View style={[contentStyle, styles.notificationContent]}>
              <Text
                style={[
                  styles.title,
                  styles.notificationTitle,
                  isNarrow && styles.titleNarrow,
                ]}>
                Stay Updated
              </Text>
              <Text
                style={[
                  styles.title,
                  styles.titleAccent,
                  styles.notificationTitle,
                  isNarrow && styles.titleNarrow,
                ]}>
                Your Way
              </Text>
              <Text
                style={[
                  styles.description,
                  styles.notificationDescription,
                  isNarrow && styles.descriptionNarrow,
                ]}>
                Turn on notifications to never miss{`\n`}important updates,
                reminders, and{`\n`}school announcements.
              </Text>

              <PrimaryButton
                accessibilityLabel="Enable Notifications"
                disabled={isBusy}
                onPress={handleEnableNotifications}>
                {isRequestingPermission
                  ? 'Enabling Notifications...'
                  : 'Enable Notifications'}
              </PrimaryButton>
              <Pressable
                accessibilityLabel="Not Now"
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => goToPage(2)}
                style={({pressed}) => [
                  styles.secondaryButton,
                  (pressed || isBusy) && styles.buttonPressed,
                ]}>
                <Text style={styles.secondaryButtonLabel}>Not Now</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.page, pageStyle]}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={supportShield}
              style={[
                styles.supportShield,
                isCompact && styles.supportShieldCompact,
                {left: (width - (isCompact ? 410 : 480)) / 2},
              ]}
            />
            <View style={contentStyle}>
              <Text style={[styles.title, isNarrow && styles.titleNarrow]}>
                Your Journey,
              </Text>
              <Text
                style={[
                  styles.title,
                  styles.titleAccent,
                  isNarrow && styles.titleNarrow,
                ]}>
                Our Support
              </Text>
              <View style={styles.titleUnderline} />
              <Text
                style={[
                  styles.description,
                  styles.supportDescription,
                  isNarrow && styles.descriptionNarrow,
                ]}>
                We’re here to support your learning journey and help you
                achieve your goals.
              </Text>

              <PrimaryButton
                accessibilityLabel="Finish onboarding"
                disabled={isBusy}
                onPress={handleComplete}>
                {isCompleting ? 'Getting Started...' : 'Get Started'}
              </PrimaryButton>
            </View>
          </View>
        </ScrollView>

        <View
          accessibilityLabel={`Onboarding page ${pageIndex + 1} of ${pageCount}`}
          style={styles.pagination}>
          {Array.from({length: pageCount}, (_, index) => (
            <View
              key={index}
              style={[styles.dot, index === pageIndex && styles.activeDot]}
            />
          ))}
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

type PrimaryButtonProps = {
  accessibilityLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
};

const PrimaryButton = ({
  accessibilityLabel,
  children,
  disabled = false,
  onPress,
}: PrimaryButtonProps) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={({pressed}) => [
      styles.primaryButton,
      (pressed || disabled) && styles.buttonPressed,
    ]}>
    <Text style={styles.primaryButtonLabel}>{children}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  activeDot: {
    backgroundColor: '#1976F3',
  },
  background: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  carousel: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 64,
    paddingHorizontal: 38,
    paddingTop: 170,
  },
  contentCompact: {
    paddingBottom: 58,
    paddingHorizontal: 26,
    paddingTop: 130,
  },
  contentNarrow: {
    paddingHorizontal: 20,
  },
  description: {
    color: '#37455B',
    fontSize: 19,
    fontWeight: '400',
    lineHeight: 29,
    marginTop: 20,
    textAlign: 'center',
  },
  welcomeContent: {
    paddingTop: 190,
  },
  welcomeDescription: {
    maxWidth: 360,
  },
  welcomeTitle: {
    fontSize: 47,
    lineHeight: 54,
  },
  descriptionNarrow: {
    fontSize: 17,
    lineHeight: 25,
    marginTop: 16,
  },
  dot: {
    backgroundColor: '#C9DBF6',
    borderRadius: 7,
    height: 14,
    marginHorizontal: 8,
    width: 14,
  },
  page: {
    height: '100%',
  },
  pagination: {
    alignItems: 'center',
    bottom: 20,
    flexDirection: 'row',
    height: 30,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  notificationBackground: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  notificationContent: {
    paddingBottom: 44,
    paddingTop: 210,
  },
  notificationDescription: {
    maxWidth: 350,
  },
  notificationTitle: {
    fontSize: 45,
    lineHeight: 52,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1460E8',
    borderRadius: 25,
    height: 60,
    justifyContent: 'center',
    marginTop: 28,
    maxWidth: 340,
    overflow: 'hidden',
    shadowColor: '#1460E8',
    shadowOffset: {height: 9, width: 0},
    shadowOpacity: 0.25,
    shadowRadius: 14,
    width: '100%',
    elevation: 6,
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 14,
    minHeight: 34,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  secondaryButtonLabel: {
    color: '#1460E8',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  skipButton: {
    alignItems: 'center',
    minHeight: 44,
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 7,
    position: 'absolute',
    right: 18,
    top: 10,
    zIndex: 2,
  },
  skipLabel: {
    color: '#0758D8',
    fontSize: 23,
    fontWeight: '500',
    lineHeight: 30,
  },
  supportDescription: {
    maxWidth: 340,
  },
  supportShield: {
    height: 610,
    position: 'absolute',
    top: 18,
    width: 480,
  },
  supportShieldCompact: {
    height: 520,
    top: -4,
    width: 410,
  },
  title: {
    color: '#17253B',
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1.4,
    lineHeight: 53,
    textAlign: 'center',
  },
  titleAccent: {
    color: '#1976F3',
  },
  titleNarrow: {
    fontSize: 40,
    lineHeight: 47,
  },
  titleUnderline: {
    backgroundColor: '#1976F3',
    borderRadius: 2,
    height: 5,
    marginTop: 12,
    width: 65,
  },
});
