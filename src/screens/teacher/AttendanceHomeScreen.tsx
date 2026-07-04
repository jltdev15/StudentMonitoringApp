import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ActionRow} from '../../components/ActionRow';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<TeacherStackParamList, 'AttendanceHome'>;

export const AttendanceHomeScreen = ({navigation}: Props) => (
  <Screen>
    <AppHeader
      title="Attendance"
      subtitle="Record, review, and monitor attendance by status."
      showBack={false}
    />
    <ActionRow
      icon="calendar-check-outline"
      label="Take Attendance"
      primary
      onPress={() => navigation.navigate('Attendance')}
    />
    <ActionRow
      icon="history"
      label="Attendance History"
      onPress={() => navigation.navigate('AttendanceHistory')}
    />
    <ActionRow
      icon="calendar-today"
      label="Daily Attendance"
      onPress={() => navigation.navigate('DailyAttendance')}
    />
    <ActionRow
      icon="clock-alert-outline"
      label="Late Students"
      onPress={() =>
        navigation.navigate('AttendanceStatusList', {
          status: 'late',
          title: 'Late Students',
        })
      }
    />
    <ActionRow
      icon="account-remove-outline"
      label="Absent Students"
      onPress={() =>
        navigation.navigate('AttendanceStatusList', {
          status: 'absent',
          title: 'Absent Students',
        })
      }
    />
    <ActionRow
      icon="account-check-outline"
      label="Excused Students"
      onPress={() =>
        navigation.navigate('AttendanceStatusList', {
          status: 'excused',
          title: 'Excused Students',
        })
      }
    />
  </Screen>
);
