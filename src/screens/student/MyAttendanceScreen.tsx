import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {useAuth} from '../../context/AuthContext';
import {getStudentAttendance} from '../../services/attendanceService';
import {AttendanceRecord} from '../../types/models';
import {toMonthKey, toReadableDate} from '../../utils/dateUtils';

const toMonthLabel = (monthKey: string) =>
  new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

const shiftMonth = (monthKey: string, amount: number) => {
  const nextDate = new Date(`${monthKey}-01T00:00:00`);
  nextDate.setMonth(nextDate.getMonth() + amount);
  return toMonthKey(nextDate);
};

export const MyAttendanceScreen = () => {
  const {profile, student} = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [month, setMonth] = useState(toMonthKey());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const studentId = profile?.studentId || student?.id;
    setLoading(true);
    setError('');
    try {
      if (studentId) {
        setRecords(await getStudentAttendance(studentId));
      }
    } catch {
      setError('We could not load your attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile?.studentId, student?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => records.filter(record => record.date.startsWith(month)),
    [month, records],
  );

  if (loading) {
    return <LoadingState label="Loading attendance..." />;
  }

  if (error) {
    return (
      <Screen>
        <AppHeader title="My Attendance" subtitle="Review records by month." />
        <EmptyState
          title="Unable to load attendance"
          message={error}
          actionLabel="Try again"
          onAction={load}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="My Attendance" subtitle="Review records by month." />
      <View style={styles.monthCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setMonth(current => shiftMonth(current, -1))}
          style={({pressed}) => [
            styles.monthButton,
            pressed && styles.pressed,
          ]}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#2563EB" />
        </Pressable>
        <View style={styles.monthCopy}>
          <Text style={styles.monthEyebrow}>Selected Month</Text>
          <Text numberOfLines={1} style={styles.monthLabel}>
            {toMonthLabel(month)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setMonth(current => shiftMonth(current, 1))}
          style={({pressed}) => [
            styles.monthButton,
            pressed && styles.pressed,
          ]}>
          <MaterialCommunityIcons name="chevron-right" size={26} color="#2563EB" />
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Records</Text>
        <Text style={styles.sectionMeta}>{filtered.length} found</Text>
      </View>

      {filtered.length ? (
        filtered.map(record => (
          <AppCard key={record.id} style={styles.recordCard}>
            <View style={styles.recordIcon}>
              <MaterialCommunityIcons
                name="calendar-check-outline"
                size={24}
                color="#2563EB"
              />
            </View>
            <View style={styles.recordCopy}>
              <Text numberOfLines={1} style={styles.recordDate}>
                {toReadableDate(record.date)}
              </Text>
              {record.remarks ? (
                <Text numberOfLines={2} style={styles.remarks}>
                  {record.remarks}
                </Text>
              ) : (
                <Text style={styles.remarks}>No remarks</Text>
              )}
            </View>
            <StatusBadge status={record.status} />
          </AppCard>
        ))
      ) : (
        <EmptyState
          title="No attendance records"
          message="Records will appear after your teacher saves attendance."
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  monthButton: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  monthCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    padding: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  monthCopy: {
    flex: 1,
    minWidth: 0,
  },
  monthEyebrow: {
    color: '#52617E',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  monthLabel: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  pressed: {
    opacity: 0.82,
  },
  recordCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  recordCopy: {
    flex: 1,
    minWidth: 0,
  },
  recordDate: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '900',
  },
  recordIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  remarks: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionMeta: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
});
