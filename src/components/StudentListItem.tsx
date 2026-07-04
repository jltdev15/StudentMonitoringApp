import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {StudentRecord} from '../types/models';
import {AppCard} from './AppCard';
import {StatusBadge} from './StatusBadge';

type Props = {
  student: StudentRecord;
  onPress?: () => void;
};

export const StudentListItem = ({student, onPress}: Props) => (
  <AppCard onPress={onPress}>
    <View style={styles.row}>
      <View style={styles.avatar}>
        <MaterialCommunityIcons
          name="account-outline"
          size={28}
          color="#2563EB"
        />
      </View>
      <View style={styles.text}>
        <Text variant="titleMedium" style={styles.name}>
          {student.fullName}
        </Text>
        <Text style={styles.meta}>
          {student.studentNumber} · {student.email || 'No email'}
        </Text>
      </View>
      <StatusBadge status={student.status} />
    </View>
  </AppCard>
);

const styles = StyleSheet.create({
  meta: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  name: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    flex: 1,
    paddingRight: 8,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginRight: 14,
    width: 52,
  },
});
