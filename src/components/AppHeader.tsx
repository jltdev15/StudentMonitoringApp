import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {Pressable, StyleSheet, View, useWindowDimensions} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  title: string;
  subtitle?: string;
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
}: Props) => {
  const navigation = useNavigation();
  const {width} = useWindowDimensions();
  const isCompact = width < 560;
  const canGoBack = navigation.canGoBack();
  const shouldShowBack = showBack ?? canGoBack;
  const handleBack = onBackPress || navigation.goBack;

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View style={styles.heroGlow} />
      <View style={styles.topRow}>
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
        ) : (
          <View style={styles.iconSpacer} />
        )}
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

      <Text
        variant="headlineSmall"
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        style={[styles.title, isCompact && styles.titleCompact]}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          variant="bodyMedium"
          numberOfLines={3}
          style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#062A66',
    marginBottom: 26,
    marginHorizontal: -20,
    marginTop: -20,
    minHeight: 220,
    overflow: 'hidden',
    paddingBottom: 42,
    paddingHorizontal: 34,
    paddingTop: 38,
  },
  containerCompact: {
    minHeight: 190,
    paddingBottom: 34,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  heroGlow: {
    backgroundColor: '#0C3D87',
    borderRadius: 150,
    height: 300,
    opacity: 0.22,
    position: 'absolute',
    right: -120,
    top: -110,
    width: 300,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  iconButtonPressed: {
    opacity: 0.82,
  },
  iconSpacer: {
    height: 50,
    width: 50,
  },
  subtitle: {
    color: '#E7EEFD',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 10,
    maxWidth: 620,
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 28,
  },
  titleCompact: {
    fontSize: 27,
    marginTop: 22,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
