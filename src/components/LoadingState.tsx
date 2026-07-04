import React, {useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

const classTrackLogo = require('../assets/images/class-track-logo.png');

export const LoadingState = (_props: {label?: string}) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const {width} = useWindowDimensions();
  const logoSize = width < 360 ? 86 : 108;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        duration: 2200,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );

    pulseLoop.start();
    spinLoop.start();

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, spin]);

  const animatedLogoStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1],
      }),
      transform: [
        {
          scale: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.96, 1.04],
          }),
        },
      ],
    }),
    [pulse],
  );

  const animatedRingStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.32, 0.72],
      }),
      transform: [
        {
          rotate: spin.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          }),
        },
        {
          scale: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.94, 1.08],
          }),
        },
      ],
    }),
    [pulse, spin],
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.logoStage,
          {
            height: logoSize + 42,
            width: logoSize + 42,
          },
        ]}>
        <Animated.View
          style={[
            styles.ring,
            animatedRingStyle,
            {
              borderRadius: (logoSize + 34) / 2,
              height: logoSize + 34,
              width: logoSize + 34,
            },
          ]}
        />
        <Animated.View style={[styles.logoShell, animatedLogoStyle]}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={classTrackLogo}
            style={{height: logoSize, width: logoSize}}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F6F9FE',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    borderColor: '#2563EB',
    borderRightColor: 'rgba(37, 99, 235, 0.14)',
    borderTopColor: 'rgba(37, 99, 235, 0.14)',
    borderWidth: 3,
    position: 'absolute',
  },
});
