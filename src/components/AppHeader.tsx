import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const coverBackground = require('../assets/images/cover-bg.webp');

type Props = {
  title: string;
  subtitle?: string;
  variant?: 'default' | 'teacher';
  titleInline?: boolean;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
};

export const AppHeader = ({
  title,
  subtitle,
  showBack,
  onBackPress,
  rightIcon,
  onRightPress,
  variant = 'default',
  titleInline = false,
}: Props) => {
  const navigation = useNavigation();
  const {width} = useWindowDimensions();
  const isCompact = width < 560;
  const canGoBack = navigation.canGoBack();
  const shouldShowBack = showBack ?? canGoBack;
  const shouldUseInlineTitle = titleInline || shouldShowBack;
  const handleBack = onBackPress || navigation.goBack;

  return (
    <ImageBackground
      imageStyle={styles.coverImage}
      resizeMode="cover"
      source={coverBackground}
      style={[
        styles.container,
        variant === 'teacher' && styles.teacherContainer,
        shouldUseInlineTitle && styles.inlineContainer,
        isCompact && styles.containerCompact,
        isCompact && variant === 'teacher' && styles.teacherContainerCompact,
        isCompact && shouldUseInlineTitle && styles.inlineContainerCompact,
      ]}>
      <View style={styles.coverOverlay} />
      <View style={[styles.topRow, shouldUseInlineTitle && styles.inlineTopRow]}>
        {shouldShowBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            style={({pressed}) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={isCompact ? 30 : 34}
              color="#FFFFFF"
            />
          </Pressable>
        ) : !shouldUseInlineTitle ? (
          <View style={styles.iconSpacer} />
        ) : null}
        {shouldUseInlineTitle ? (
          <View style={styles.inlineCopy}>
            <Text
              testID="app-header-inline-title"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={styles.inlineTitle}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                variant="bodyMedium"
                numberOfLines={2}
                style={[styles.subtitle, styles.inlineSubtitle]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
        {rightIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightIcon}
            onPress={onRightPress}
            style={({pressed}) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}>
            <MaterialCommunityIcons
              name={rightIcon}
              size={isCompact ? 26 : 30}
              color="#FFFFFF"
            />
          </Pressable>
        ) : null}
      </View>

      {!shouldUseInlineTitle ? (
        <Text
          variant="headlineSmall"
          testID="app-header-hero-title"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={[
            styles.title,
            variant === 'teacher' && styles.teacherTitle,
            isCompact && styles.titleCompact,
          ]}>
          {title}
        </Text>
      ) : null}
      {subtitle && !shouldUseInlineTitle ? (
        <Text
          variant="bodyMedium"
          numberOfLines={3}
          style={[
            styles.subtitle,
            variant === 'teacher' && styles.teacherSubtitle,
            isCompact && styles.subtitleCompact,
          ]}>
          {subtitle}
        </Text>
      ) : null}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#083A93',
    marginBottom: 22,
    marginHorizontal: -20,
    marginTop: -20,
    minHeight: 184,
    overflow: 'hidden',
    paddingBottom: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
  },
  containerCompact: {
    minHeight: 166,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  teacherContainer: {
    backgroundColor: '#083A93',
    marginBottom: 22,
    minHeight: 184,
    paddingBottom: 28,
  },
  teacherContainerCompact: {
    minHeight: 166,
    paddingBottom: 24,
    paddingTop: 22,
  },
  coverImage: {opacity: 0.98},
  coverOverlay: {
    backgroundColor: 'rgba(5, 50, 138, 0.38)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconButtonPressed: {
    opacity: 0.82,
  },
  iconSpacer: {
    height: 42,
    width: 42,
  },
  inlineTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  inlineCopy: {flex: 1, marginHorizontal: 10, minWidth: 0},
  inlineContainer: {minHeight: 128, paddingBottom: 20},
  inlineContainerCompact: {minHeight: 112, paddingBottom: 18},
  inlineTopRow: {marginTop: 12},
  inlineSubtitle: {lineHeight: 18, marginTop: 1},
  subtitle: {
    color: '#E7EEFD',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: 4,
    maxWidth: 620,
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 18,
  },
  titleCompact: {
    fontSize: 26,
    marginTop: 18,
  },
  teacherTitle: {
    fontSize: 30,
    letterSpacing: -0.7,
    marginTop: 18,
  },
  teacherSubtitle: {
    color: '#DDEAFF',
    fontWeight: '500',
    marginTop: 4,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
