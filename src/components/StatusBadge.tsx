import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import {statusColors} from '../utils/constants';

export const StatusBadge = ({status}: {status: string}) => {
  const color = statusColors[status] || '#64748B';
  return (
    <View style={[styles.badge, {backgroundColor: `${color}1A`}]}>
      <Text style={[styles.text, {color}]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
});
