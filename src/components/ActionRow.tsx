import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  label: string;
  icon: string;
  onPress: () => void;
  primary?: boolean;
};

export const ActionRow = ({label, icon, onPress, primary = false}: Props) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({pressed}) => [
      styles.row,
      primary && styles.primaryRow,
      pressed && styles.pressed,
    ]}>
    <View style={[styles.iconWrap, primary && styles.primaryIconWrap]}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={primary ? '#2563EB' : '#2563EB'}
      />
    </View>
    <Text
      numberOfLines={2}
      style={[styles.label, primary && styles.primaryLabel]}>
      {label}
    </Text>
    <MaterialCommunityIcons
      name="chevron-right"
      size={24}
      color={primary ? '#FFFFFF' : '#52617E'}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#EEF5FF',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  label: {
    color: '#06143A',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
    transform: [{scale: 0.985}],
  },
  primaryIconWrap: {
    backgroundColor: '#FFFFFF',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  primaryRow: {
    backgroundColor: '#2563EB',
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    minHeight: 70,
    paddingHorizontal: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
});
