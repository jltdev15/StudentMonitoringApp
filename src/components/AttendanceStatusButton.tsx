import React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AttendanceStatus} from '../types/models';
import {statusColors} from '../utils/constants';

type Props = {
  status: AttendanceStatus;
  selected: boolean;
  onPress: () => void;
};

const statusIcons: Record<AttendanceStatus, string> = {
  present: 'account-check-outline',
  absent: 'account-remove-outline',
  late: 'clock-alert-outline',
  excused: 'account-alert-outline',
};

export const AttendanceStatusButton = ({status, selected, onPress}: Props) => {
  const color = statusColors[status];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        {
          backgroundColor: selected ? color : `${color}14`,
          borderColor: selected ? color : `${color}40`,
        },
        pressed && styles.pressed,
      ]}>
      <MaterialCommunityIcons
        name={
          selected
            ? statusIcons[status].replace('-outline', '')
            : statusIcons[status]
        }
        size={18}
        color={selected ? '#FFFFFF' : color}
        style={styles.icon}
      />
      <Text style={[styles.label, {color: selected ? '#FFFFFF' : color}]}>
        {status}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    margin: 4,
    minWidth: '45%',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  pressed: {
    opacity: 0.75,
    transform: [{scale: 0.98}],
  },
});
