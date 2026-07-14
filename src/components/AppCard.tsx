import React, {PropsWithChildren} from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

type Props = PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

export const AppCard = ({children, onPress, style}: Props) => {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({pressed}) => [
          styles.card,
          style,
          pressed && styles.cardPressed,
        ]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF3FA',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    marginBottom: 13,
    padding: 16,
    shadowColor: '#7685A3',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardPressed: {
    opacity: 0.86,
  },
});
