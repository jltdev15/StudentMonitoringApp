import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {useAuth} from '../../context/AuthContext';
import {getStudentAttendance} from '../../services/attendanceService';
import {AttendanceRecord, AttendanceStatus} from '../../types/models';
import {toMonthKey, toReadableDate} from '../../utils/dateUtils';

type AttendanceFilter = 'month' | 'week' | 'all';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const statusPriority: AttendanceStatus[] = [
  'absent',
  'late',
  'excused',
  'present',
];

const statusColors: Record<AttendanceStatus, string> = {
  absent: '#F43F5E',
  excused: '#7C8BA8',
  late: '#F97316',
  present: '#16A34A',
};

const statusIcons: Record<AttendanceStatus, string> = {
  absent: 'close-circle-outline',
  excused: 'information-outline',
  late: 'clock-outline',
  present: 'check-circle-outline',
};

const dateFromKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`);

const toDateKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const toMonthLabel = (monthKey: string) =>
  dateFromKey(`${monthKey}-01`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

const toWeekday = (dateKey: string) =>
  dateFromKey(dateKey).toLocaleDateString(undefined, {weekday: 'long'});

const toLongReadableDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const shiftMonth = (monthKey: string, amount: number) => {
  const nextDate = dateFromKey(`${monthKey}-01`);
  nextDate.setMonth(nextDate.getMonth() + amount);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
};

const monthDays = (monthKey: string) => {
  const first = dateFromKey(`${monthKey}-01`);
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({length: cellCount}, (_, index) => {
    const date = new Date(first);
    date.setDate(index - firstWeekday + 1);
    return {date, inMonth: date.getMonth() === first.getMonth()};
  });
};

const getWeekRange = (today: Date) => {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {end: toDateKey(end), start: toDateKey(start)};
};

const statusForDate = (records: AttendanceRecord[]) =>
  records.reduce<Record<string, AttendanceStatus>>((summary, record) => {
    const currentStatus = summary[record.date];
    if (
      !currentStatus ||
      statusPriority.indexOf(record.status) < statusPriority.indexOf(currentStatus)
    ) {
      summary[record.date] = record.status;
    }
    return summary;
  }, {});

export const MyAttendanceScreen = () => {
  const {profile, student} = useAuth();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [month, setMonth] = useState(toMonthKey(today));
  const [filter, setFilter] = useState<AttendanceFilter>('month');
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const studentId = profile?.studentId || student?.id;
    setLoading(true);
    setError('');
    try {
      setRecords(studentId ? await getStudentAttendance(studentId) : []);
    } catch {
      setError('We could not load your attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile?.studentId, student?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const weekRange = useMemo(() => getWeekRange(today), [today]);
  const calendarDays = useMemo(() => monthDays(month), [month]);
  const statusByDate = useMemo(() => statusForDate(records), [records]);
  const filteredRecords = useMemo(() => {
    const matching = records.filter(record => {
      if (filter === 'month') {
        return record.date.startsWith(month);
      }
      if (filter === 'week') {
        return record.date >= weekRange.start && record.date <= weekRange.end;
      }
      return true;
    });
    return [...matching].sort((first, second) =>
      second.date.localeCompare(first.date),
    );
  }, [filter, month, records, weekRange]);
  const visibleRecords = showAllRecords
    ? filteredRecords
    : filteredRecords.slice(0, 4);

  const changeMonth = (amount: number) => {
    setMonth(current => shiftMonth(current, amount));
    setFilter('month');
    setShowAllRecords(false);
  };

  const selectFilter = (nextFilter: AttendanceFilter) => {
    setFilter(nextFilter);
    setShowAllRecords(false);
  };

  if (loading) {
    return <LoadingState label="Loading attendance..." />;
  }

  if (error) {
    return (
      <View style={styles.root}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.errorContent}>
          <AppHeader
            title="My Attendance"
            subtitle="Review records by month."
            showBack={false}
          />
          <EmptyState
            title="Unable to load attendance"
            message={error}
            actionLabel="Try again"
            onAction={load}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}>
        <AppHeader
          title="My Attendance"
          subtitle="Review records by month."
          showBack={false}
        />
        <View style={styles.todayCard}>
          <View style={styles.todayTile}>
            <Text style={styles.todayNumber}>{today.getDate()}</Text>
            <Text style={styles.todayWeekdayShort}>
              {today.toLocaleDateString(undefined, {weekday: 'short'})}
            </Text>
          </View>
          <View style={styles.todayCopy}>
            <Text numberOfLines={1} style={styles.todayDate}>
              Today, {toLongReadableDate(today)}
            </Text>
            <Text style={styles.todayWeekday}>{toWeekday(todayKey)}</Text>
          </View>
          <View style={styles.monthControls}>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => changeMonth(-1)}
              style={({pressed}) => [
                styles.monthButton,
                pressed && styles.pressed,
              ]}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={25}
                color="#657595"
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => changeMonth(1)}
              style={({pressed}) => [
                styles.monthButton,
                pressed && styles.pressed,
              ]}>
              <MaterialCommunityIcons
                name="chevron-right"
                size={25}
                color="#657595"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.filterBar}>
          {(
            [
              ['month', 'This Month'],
              ['week', 'This Week'],
              ['all', 'All Records'],
            ] as [AttendanceFilter, string][]
          ).map(([key, label]) => {
            const selected = filter === key;
            return (
              <Pressable
                accessibilityLabel={label}
                accessibilityRole="button"
                accessibilityState={{selected}}
                key={key}
                onPress={() => selectFilter(key)}
                style={({pressed}) => [
                  styles.filterButton,
                  selected && styles.filterButtonActive,
                  pressed && styles.pressed,
                ]}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.filterText,
                    selected && styles.filterTextActive,
                  ]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeading}>
            <Text style={styles.monthLabel}>{toMonthLabel(month)}</Text>
            <View style={styles.legend}>
              {(['present', 'late', 'absent'] as AttendanceStatus[]).map(
                status => (
                  <View key={status} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {backgroundColor: statusColors[status]},
                      ]}
                    />
                    <Text style={styles.legendText}>{status}</Text>
                  </View>
                ),
              )}
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {weekDays.map(day => (
              <Text key={day} style={styles.weekdayLabel}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map(({date, inMonth}) => {
              const dateKey = toDateKey(date);
              const status = statusByDate[dateKey];
              const isToday = dateKey === todayKey;
              return (
                <View key={dateKey} style={styles.calendarDay}>
                  <View
                    style={[
                      styles.calendarDateCircle,
                      isToday && styles.calendarDateCircleToday,
                    ]}>
                    <Text
                      style={[
                        styles.calendarDate,
                        !inMonth && styles.calendarDateOutsideMonth,
                        isToday && styles.calendarDateToday,
                      ]}>
                      {date.getDate()}
                    </Text>
                  </View>
                  {status ? (
                    <View
                      accessibilityLabel={`${dateKey} ${status}`}
                      style={[
                        styles.calendarStatusDot,
                        {backgroundColor: statusColors[status]},
                      ]}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.recordsCard}>
          <View style={styles.recordsHeading}>
            <Text style={styles.recordsTitle}>Recent Records</Text>
            {filteredRecords.length > 4 ? (
              <Pressable
                accessibilityLabel={showAllRecords ? 'Show fewer records' : 'View all records'}
                accessibilityRole="button"
                onPress={() => setShowAllRecords(current => !current)}
                style={({pressed}) => [
                  styles.viewAllButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.viewAllText}>
                  {showAllRecords ? 'Show less' : 'View all'}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#1E63EE"
                />
              </Pressable>
            ) : null}
          </View>

          {visibleRecords.length ? (
            visibleRecords.map((record, index) => {
              const color = statusColors[record.status];
              return (
                <View
                  key={record.id}
                  style={[
                    styles.recordRow,
                    index > 0 && styles.recordRowBorder,
                  ]}>
                  <View style={styles.recordIcon}>
                    <MaterialCommunityIcons
                      name="calendar-check-outline"
                      size={23}
                      color="#1E63EE"
                    />
                  </View>
                  <View style={styles.recordCopy}>
                    <Text numberOfLines={1} style={styles.recordDate}>
                      {toReadableDate(record.date)}
                    </Text>
                    <Text numberOfLines={1} style={styles.recordMeta}>
                      {record.remarks
                        ? `${toWeekday(record.date)} · ${record.remarks}`
                        : toWeekday(record.date)}
                    </Text>
                  </View>
                  <View
                    style={[styles.statusChip, {backgroundColor: `${color}16`}]}
                  >
                    <MaterialCommunityIcons
                      name={statusIcons[record.status]}
                      size={15}
                      color={color}
                    />
                    <Text style={[styles.statusText, {color}]}>
                      {record.status}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.noRecords}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={31}
                color="#9AA9C2"
              />
              <Text style={styles.noRecordsTitle}>No attendance records</Text>
              <Text style={styles.noRecordsText}>
                Records will appear after your teacher saves attendance.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {backgroundColor: '#F6F9FE', flex: 1},
  scroll: {backgroundColor: '#F6F9FE', flex: 1},
  scrollContent: {padding: 18, paddingBottom: 34},
  errorContent: {padding: 20, paddingBottom: 34},
  todayCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EDF2FA',
    borderRadius: 17,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    minHeight: 98,
    padding: 12,
    shadowColor: '#7082A4',
    shadowOffset: {height: 6, width: 0},
    shadowOpacity: 0.09,
    shadowRadius: 13,
  },
  todayTile: {
    alignItems: 'center',
    backgroundColor: '#1E63EE',
    borderRadius: 13,
    height: 70,
    justifyContent: 'center',
    shadowColor: '#1E63EE',
    shadowOffset: {height: 4, width: 0},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: 70,
  },
  todayNumber: {color: '#FFFFFF', fontSize: 27, fontWeight: '900', lineHeight: 31},
  todayWeekdayShort: {color: '#FFFFFF', fontSize: 11, fontWeight: '800', marginTop: 1, textTransform: 'uppercase'},
  todayCopy: {flex: 1, marginLeft: 12, minWidth: 0},
  todayDate: {color: '#1E63EE', fontSize: 16, fontWeight: '900'},
  todayWeekday: {color: '#627291', fontSize: 13, fontWeight: '600', marginTop: 4},
  monthControls: {flexDirection: 'row', gap: 7},
  monthButton: {
    alignItems: 'center',
    backgroundColor: '#F7F9FD',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  filterBar: {
    backgroundColor: '#F9FBFF',
    borderColor: '#E4EAF5',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    padding: 3,
  },
  filterButton: {alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 4},
  filterButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CDDBFA',
    borderRadius: 10,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#7E91B3',
    shadowOffset: {height: 2, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  filterText: {color: '#7181A0', fontSize: 12, fontWeight: '700'},
  filterTextActive: {color: '#155FE7', fontWeight: '900'},
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F8',
    borderRadius: 17,
    borderWidth: 1,
    elevation: 2,
    marginTop: 14,
    padding: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  calendarHeading: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  monthLabel: {color: '#102653', fontSize: 18, fontWeight: '900'},
  legend: {alignItems: 'center', flexDirection: 'row', gap: 10},
  legendItem: {alignItems: 'center', flexDirection: 'row', gap: 4},
  legendDot: {borderRadius: 4, height: 8, width: 8},
  legendText: {color: '#687A9D', fontSize: 10, fontWeight: '700', textTransform: 'capitalize'},
  weekdayRow: {flexDirection: 'row', marginTop: 18},
  weekdayLabel: {color: '#647394', flex: 1, fontSize: 10, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase'},
  calendarGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 9},
  calendarDay: {alignItems: 'center', height: 39, justifyContent: 'center', width: '14.2857%'},
  calendarDateCircle: {alignItems: 'center', borderRadius: 15, height: 30, justifyContent: 'center', width: 30},
  calendarDateCircleToday: {backgroundColor: '#1E63EE'},
  calendarDate: {color: '#172849', fontSize: 13, fontWeight: '800'},
  calendarDateOutsideMonth: {color: '#B7C1D4'},
  calendarDateToday: {color: '#FFFFFF'},
  calendarStatusDot: {borderRadius: 3, bottom: 1, height: 6, position: 'absolute', width: 6},
  recordsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F8',
    borderRadius: 17,
    borderWidth: 1,
    elevation: 2,
    marginTop: 16,
    overflow: 'hidden',
    paddingTop: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  recordsHeading: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 9},
  recordsTitle: {color: '#102653', fontSize: 16, fontWeight: '900'},
  viewAllButton: {alignItems: 'center', flexDirection: 'row'},
  viewAllText: {color: '#1E63EE', fontSize: 12, fontWeight: '900'},
  recordRow: {alignItems: 'center', flexDirection: 'row', minHeight: 66, paddingHorizontal: 14, paddingVertical: 9},
  recordRowBorder: {borderTopColor: '#EEF2F8', borderTopWidth: 1},
  recordIcon: {alignItems: 'center', backgroundColor: '#EDF3FF', borderRadius: 18, height: 36, justifyContent: 'center', width: 36},
  recordCopy: {flex: 1, marginLeft: 10, minWidth: 0},
  recordDate: {color: '#162A55', fontSize: 14, fontWeight: '900'},
  recordMeta: {color: '#687A9D', fontSize: 11, fontWeight: '600', marginTop: 3},
  statusChip: {alignItems: 'center', borderRadius: 7, flexDirection: 'row', gap: 4, marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6},
  statusText: {fontSize: 11, fontWeight: '900', textTransform: 'capitalize'},
  noRecords: {alignItems: 'center', paddingHorizontal: 28, paddingVertical: 30},
  noRecordsTitle: {color: '#162A55', fontSize: 15, fontWeight: '900', marginTop: 9},
  noRecordsText: {color: '#7181A0', fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: 'center'},
  pressed: {opacity: 0.72},
});
