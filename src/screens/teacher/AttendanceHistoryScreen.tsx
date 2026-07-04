import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {AttendanceClassSelector} from '../../components/AttendanceClassSelector';
import {EmptyState} from '../../components/EmptyState';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {AppCard} from '../../components/AppCard';
import {getAttendanceByClassRange} from '../../services/attendanceService';
import {getTeacherClasses} from '../../services/classService';
import {useAuth} from '../../context/AuthContext';
import {AttendanceRecord, ClassRecord} from '../../types/models';
import {toDateString} from '../../utils/dateUtils';
import {AppButton} from '../../components/AppButton';

export const AttendanceHistoryScreen = () => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState('');
  const [startDate, setStartDate] = useState(toDateString());
  const [endDate, setEndDate] = useState(toDateString());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const loadClasses = useCallback(async () => {
    if (!profile) {
      return;
    }
    setClasses(await getTeacherClasses(profile.uid));
  }, [profile]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const selectClass = (nextClassId: string) => {
    setClassId(nextClassId);
    setRecords([]);
  };

  const clearClass = () => {
    setClassId('');
    setRecords([]);
  };

  const load = async () => {
    if (classId) {
      setRecords(await getAttendanceByClassRange(classId, startDate, endDate));
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Attendance History"
        subtitle="Review attendance by class and date range."
      />
      <AttendanceClassSelector
        classes={classes}
        selectedClassId={classId}
        onSelectClass={selectClass}
        onClearClass={clearClass}
      />
      <AppTextInput
        label="Start date"
        value={startDate}
        onChangeText={setStartDate}
      />
      <AppTextInput
        label="End date"
        value={endDate}
        onChangeText={setEndDate}
      />
      <AppButton onPress={load}>Load History</AppButton>
      {records.length ? (
        records.map(record => (
          <AppCard key={record.id}>
            <Text style={styles.date}>{record.date}</Text>
            <StatusBadge status={record.status} />
            {record.remarks ? (
              <Text style={styles.remarks}>{record.remarks}</Text>
            ) : null}
          </AppCard>
        ))
      ) : (
        <EmptyState title="No attendance loaded" />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  date: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  remarks: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
});
