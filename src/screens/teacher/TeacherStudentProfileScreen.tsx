import React from 'react';
import {StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<
  TeacherStackParamList,
  'TeacherStudentProfile'
>;

export const TeacherStudentProfileScreen = ({route}: Props) => {
  const {student} = route.params;
  return (
    <Screen>
      <AppHeader
        title={student.fullName}
        subtitle="Student profile and guardian details."
      />
      <AppCard>
        <Text style={styles.label}>Student Number</Text>
        <Text style={styles.value}>{student.studentNumber || '-'}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{student.email || 'No email'}</Text>
        <Text style={styles.label}>Contact Number</Text>
        <Text style={styles.value}>{student.contactNumber || '-'}</Text>
        <Text style={styles.label}>Guardian</Text>
        <Text style={styles.value}>{student.guardianName || '-'}</Text>
        <Text style={styles.label}>Guardian Contact</Text>
        <Text style={styles.value}>{student.guardianContact || '-'}</Text>
        <Text style={styles.label}>Status</Text>
        <StatusBadge status={student.status} />
      </AppCard>
    </Screen>
  );
};

const styles = StyleSheet.create({
  label: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  value: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
});
