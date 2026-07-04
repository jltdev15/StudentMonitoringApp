import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {AttendanceClassSelector} from '../../components/AttendanceClassSelector';
import {EmptyState} from '../../components/EmptyState';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {useAuth} from '../../context/AuthContext';
import {getAttendanceByClassAndDate} from '../../services/attendanceService';
import {getTeacherClasses} from '../../services/classService';
import {getStudentsByClass} from '../../services/studentService';
import {AttendanceRecord, ClassRecord, StudentRecord} from '../../types/models';
import {toDateString} from '../../utils/dateUtils';

export const DailyAttendanceScreen = () => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(toDateString());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  const loadClasses = useCallback(async () => {
    if (!profile) {
      return;
    }
    const nextClasses = await getTeacherClasses(profile.uid);
    setClasses(nextClasses);
  }, [profile]);

  const load = useCallback(async () => {
    if (!classId) {
      return;
    }
    const [nextStudents, nextRecords] = await Promise.all([
      getStudentsByClass(classId),
      getAttendanceByClassAndDate(classId, date),
    ]);
    setStudents(nextStudents);
    setRecords(nextRecords);
  }, [classId, date]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    load();
  }, [load]);

  const selectClass = (nextClassId: string) => {
    setClassId(nextClassId);
    setRecords([]);
    setStudents([]);
  };

  const clearClass = () => {
    setClassId('');
    setRecords([]);
    setStudents([]);
  };

  const studentById = useMemo(
    () => Object.fromEntries(students.map(student => [student.id, student])),
    [students],
  );

  return (
    <Screen>
      <AppHeader
        title="Daily Attendance"
        subtitle="Review saved attendance for one class and date."
      />
      <AttendanceClassSelector
        classes={classes}
        selectedClassId={classId}
        onSelectClass={selectClass}
        onClearClass={clearClass}
      />
      <AppTextInput
        label="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <AppButton onPress={load}>Load Daily Attendance</AppButton>
      {records.length ? (
        records.map(record => {
          const student = studentById[record.studentId];
          return (
            <AppCard key={record.id}>
              <Text style={styles.title}>
                {student?.fullName || record.studentId}
              </Text>
              <Text style={styles.meta}>
                {student?.studentNumber || 'No student number'} · {record.date}
              </Text>
              <StatusBadge status={record.status} />
              {record.remarks ? (
                <Text style={styles.remarks}>{record.remarks}</Text>
              ) : null}
            </AppCard>
          );
        })
      ) : (
        <EmptyState
          title="No attendance records"
          message="Load a class and date with saved attendance."
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  meta: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  remarks: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  title: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
});
