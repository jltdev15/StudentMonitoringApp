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
        size={26}
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
      size={30}
      color={primary ? '#FFFFFF' : '#52617E'}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#EEF5FF',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  label: {
    color: '#06143A',
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
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
    borderRadius: 14,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    minHeight: 72,
    paddingHorizontal: 16,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
});
