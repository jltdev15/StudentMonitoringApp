import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
  tint?: string;
};

export const SummaryCard = ({
  label,
  value,
  color = '#2563EB',
  icon = 'chart-box-outline',
  tint = '#E8F1FF',
}: Props) => (
  <View style={styles.wrap}>
    <View style={[styles.card, {borderBottomColor: tint}]}>
      <View style={[styles.iconWrap, {backgroundColor: tint}]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text variant="headlineMedium" style={[styles.value, {color}]}>
        {value}
      </Text>
      <Text variant="bodySmall" style={styles.label}>
        {label}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF3FA',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    marginBottom: 14,
    minHeight: 112,
    padding: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    marginBottom: 10,
    width: 46,
  },
  label: {
    color: '#31405F',
    fontSize: 13,
    marginTop: 4,
  },
  value: {
    color: '#030C29',
    fontSize: 26,
    fontWeight: '900',
  },
  wrap: {
    flex: 1,
    minWidth: 140,
  },
});
