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
  variant?: 'default' | 'teacher';
};

export const StudentListItem = ({
  student,
  onPress,
  variant = 'default',
}: Props) => (
  <AppCard
    onPress={onPress}
    style={variant === 'teacher' ? styles.teacherCard : undefined}>
    <View style={styles.row}>
      <View
        style={[styles.avatar, variant === 'teacher' && styles.teacherAvatar]}>
        <MaterialCommunityIcons
          name="account-outline"
          size={28}
          color="#2563EB"
        />
      </View>
      <View style={styles.text}>
        <Text
          variant="titleMedium"
          style={[styles.name, variant === 'teacher' && styles.teacherName]}>
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
  teacherAvatar: {
    borderRadius: 15,
    height: 48,
    width: 48,
  },
  teacherCard: {
    borderColor: '#EEF3FA',
    borderRadius: 20,
    marginBottom: 13,
    padding: 15,
  },
  teacherName: {color: '#112B5D', fontSize: 16},
});
