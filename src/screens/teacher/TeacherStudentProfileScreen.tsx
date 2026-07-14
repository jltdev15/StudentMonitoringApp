import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {ActivityIndicator, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {StatusBadge} from '../../components/StatusBadge';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../../services/activityService';
import {getStudentAttendance} from '../../services/attendanceService';
import {
  calculateAverageScore,
  countByStatus,
} from '../../services/reportService';
import {
  ActivityRecord,
  ActivitySubmissionRecord,
  AttendanceRecord,
} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<
  TeacherStackParamList,
  'TeacherStudentProfile'
>;

type SummaryTileProps = {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  tint: string;
};

const SummaryTile = ({label, value, icon, color, tint}: SummaryTileProps) => (
  <View style={styles.summaryTile}>
    <View style={[styles.summaryIcon, {backgroundColor: tint}]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </View>
    <Text style={[styles.summaryValue, {color}]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const toDateNumber = (value: ActivityRecord['dueDate']) => {
  if (!value) {
    return 0;
  }
  return 'toDate' in value ? value.toDate().getTime() : value.getTime();
};

export const TeacherStudentProfileScreen = ({route}: Props) => {
  const {student} = route.params;
  const insets = useSafeAreaInsets();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmissionRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextAttendance, nextActivities, nextSubmissions] =
        await Promise.all([
          getStudentAttendance(student.id),
          getActivitiesForClasses(student.classIds || []),
          getSubmissionsByStudent(student.id),
        ]);
      setAttendance(nextAttendance);
      setActivities(
        [...nextActivities].sort(
          (first, second) =>
            toDateNumber(second.dueDate) - toDateNumber(first.dueDate),
        ),
      );
      setSubmissions(nextSubmissions);
    } catch {
      setError('We could not load this student’s attendance and activities.');
    } finally {
      setLoading(false);
    }
  }, [student.classIds, student.id]);

  useEffect(() => {
    load();
  }, [load]);

  const attendanceSummary = useMemo(
    () => countByStatus(attendance),
    [attendance],
  );
  const submissionsByActivity = useMemo(
    () => Object.fromEntries(submissions.map(item => [item.activityId, item])),
    [submissions],
  );
  const activitySummary = useMemo(
    () =>
      countByStatus(
        activities.map(activity => ({
          status: submissionsByActivity[activity.id]?.status || 'missing',
        })),
      ),
    [activities, submissionsByActivity],
  );
  const averageScore = useMemo(
    () => calculateAverageScore(submissions, activities),
    [activities, submissions],
  );
  const initials = student.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

  return (
    <View style={styles.root}>
      <View style={[styles.stickyHeader, {paddingTop: insets.top + 20}]}>
        <AppHeader
          variant="teacher"
          title={student.fullName}
          subtitle="Student profile, attendance, and activity progress."
        />
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}>
        <AppCard style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'S'}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text numberOfLines={1} style={styles.studentNumber}>
                {student.studentNumber || 'No student number'}
              </Text>
              <StatusBadge status={student.status} />
            </View>
          </View>
          <View style={styles.infoGrid}>
            <InfoItem
              icon="email-outline"
              label="Email"
              value={student.email || 'No email'}
            />
            <InfoItem
              icon="phone-outline"
              label="Contact Number"
              value={student.contactNumber || '-'}
            />
            <InfoItem
              icon="account-heart-outline"
              label="Guardian"
              value={student.guardianName || '-'}
            />
            <InfoItem
              icon="phone-in-talk-outline"
              label="Guardian Contact"
              value={student.guardianContact || '-'}
            />
          </View>
        </AppCard>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.loadingText}>Loading student records...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={21}
              color="#DC2626"
            />
            <View style={styles.errorCopy}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                accessibilityLabel="Retry student records"
                accessibilityRole="button"
                onPress={load}
                style={({pressed}) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {!loading && !error ? (
          <>
            <Text style={styles.sectionTitle}>Attendance</Text>
            <View style={styles.summaryGrid}>
              <SummaryTile
                label="Present"
                value={attendanceSummary.present || 0}
                icon="check-circle-outline"
                color="#16A34A"
                tint="#E7F8EE"
              />
              <SummaryTile
                label="Absent"
                value={attendanceSummary.absent || 0}
                icon="account-remove-outline"
                color="#EF4444"
                tint="#FEEBED"
              />
              <SummaryTile
                label="Late"
                value={attendanceSummary.late || 0}
                icon="clock-outline"
                color="#F97316"
                tint="#FFF1E8"
              />
              <SummaryTile
                label="Excused"
                value={attendanceSummary.excused || 0}
                icon="account-alert-outline"
                color="#2563EB"
                tint="#E9F0FF"
              />
            </View>
            {attendance.length ? (
              attendance.map(record => (
                <AppCard key={record.id} style={styles.recordCard}>
                  <View style={styles.recordIcon}>
                    <MaterialCommunityIcons
                      name="calendar-check-outline"
                      size={22}
                      color="#2563EB"
                    />
                  </View>
                  <View style={styles.recordCopy}>
                    <Text style={styles.recordTitle}>
                      {toReadableDate(record.date)}
                    </Text>
                    <Text numberOfLines={2} style={styles.recordSubtitle}>
                      {record.remarks || 'No remarks'}
                    </Text>
                  </View>
                  <StatusBadge status={record.status} />
                </AppCard>
              ))
            ) : (
              <EmptyState
                title="No attendance records"
                message="Attendance will appear after it has been recorded."
              />
            )}

            <Text style={styles.sectionTitle}>Activities</Text>
            <View style={styles.summaryGrid}>
              <SummaryTile
                label="Submitted"
                value={activitySummary.submitted || 0}
                icon="file-check-outline"
                color="#16A34A"
                tint="#E7F8EE"
              />
              <SummaryTile
                label="Missing"
                value={activitySummary.missing || 0}
                icon="file-alert-outline"
                color="#EF4444"
                tint="#FEEBED"
              />
              <SummaryTile
                label="Late"
                value={activitySummary.late || 0}
                icon="clock-alert-outline"
                color="#F97316"
                tint="#FFF1E8"
              />
              <SummaryTile
                label="Average"
                value={`${averageScore}%`}
                icon="chart-line"
                color="#2563EB"
                tint="#E9F0FF"
              />
            </View>
            {activities.length ? (
              activities.map(activity => {
                const submission = submissionsByActivity[activity.id];
                const status = submission?.status || 'missing';
                const score =
                  typeof submission?.score === 'number'
                    ? `${submission.score} / ${activity.totalPoints}`
                    : `- / ${activity.totalPoints}`;
                return (
                  <AppCard key={activity.id} style={styles.activityCard}>
                    <View style={styles.activityTopRow}>
                      <View style={styles.activityIcon}>
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={23}
                          color="#7C3AED"
                        />
                      </View>
                      <View style={styles.activityCopy}>
                        <Text numberOfLines={2} style={styles.activityTitle}>
                          {activity.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.activityMeta}>
                          Due {toReadableDate(activity.dueDate)} ·{' '}
                          {activity.totalPoints} pts
                        </Text>
                      </View>
                      <StatusBadge status={status} />
                    </View>
                    <View style={styles.activityDetails}>
                      <View style={styles.detailBox}>
                        <Text style={styles.detailLabel}>Score</Text>
                        <Text style={styles.detailValue}>{score}</Text>
                      </View>
                      <View style={styles.detailBox}>
                        <Text style={styles.detailLabel}>Remarks</Text>
                        <Text numberOfLines={2} style={styles.detailValue}>
                          {submission?.remarks || 'No remarks'}
                        </Text>
                      </View>
                    </View>
                  </AppCard>
                );
              })
            ) : (
              <EmptyState
                title="No assigned activities"
                message="Activities for this student’s classes will appear here."
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const InfoItem = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.infoItem}>
    <MaterialCommunityIcons name={icon} size={17} color="#2563EB" />
    <View style={styles.infoCopy}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoValue}>
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  activityCard: {padding: 15},
  activityCopy: {flex: 1, minWidth: 0},
  activityDetails: {flexDirection: 'row', gap: 10, marginTop: 14},
  activityIcon: {
    alignItems: 'center',
    backgroundColor: '#F1EAFF',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    marginRight: 11,
    width: 46,
  },
  activityMeta: {
    color: '#7181A0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  activityTitle: {color: '#112B5D', fontSize: 16, fontWeight: '900'},
  activityTopRow: {alignItems: 'center', flexDirection: 'row'},
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E9F0FF',
    borderRadius: 29,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  avatarText: {color: '#2563EB', fontSize: 20, fontWeight: '900'},
  detailBox: {
    backgroundColor: '#F6F9FE',
    borderColor: '#E8EDF5',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  detailLabel: {
    color: '#7181A0',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#112B5D',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  content: {padding: 20, paddingBottom: 42},
  errorCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    padding: 14,
  },
  errorCopy: {flex: 1},
  errorText: {color: '#B91C1C', fontSize: 14, fontWeight: '700'},
  infoCopy: {flex: 1, minWidth: 0},
  infoGrid: {gap: 13, marginTop: 20},
  infoItem: {alignItems: 'flex-start', flexDirection: 'row', gap: 9},
  infoLabel: {
    color: '#7181A0',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {color: '#112B5D', fontSize: 14, fontWeight: '700', marginTop: 2},
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF3FA',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    padding: 16,
  },
  loadingText: {color: '#52617E', fontSize: 14, fontWeight: '700'},
  pressed: {opacity: 0.8},
  profileCard: {borderColor: '#EEF3FA', borderRadius: 20, padding: 17},
  profileCopy: {flex: 1, gap: 8, marginLeft: 13},
  profileTopRow: {alignItems: 'center', flexDirection: 'row'},
  recordCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 13,
  },
  recordCopy: {flex: 1, minWidth: 0},
  recordIcon: {
    alignItems: 'center',
    backgroundColor: '#E9F0FF',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  recordSubtitle: {
    color: '#7181A0',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 3,
  },
  recordTitle: {color: '#112B5D', fontSize: 15, fontWeight: '900'},
  retryButton: {alignSelf: 'flex-start', marginTop: 7},
  retryText: {color: '#DC2626', fontSize: 13, fontWeight: '900'},
  root: {backgroundColor: '#F6F9FE', flex: 1},
  scroll: {backgroundColor: '#F6F9FE', flex: 1},
  sectionTitle: {
    color: '#112B5D',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 13,
    marginTop: 26,
  },
  studentNumber: {color: '#112B5D', fontSize: 16, fontWeight: '900'},
  stickyHeader: {backgroundColor: '#F6F9FE', paddingHorizontal: 20, zIndex: 2},
  summaryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  summaryIcon: {
    alignItems: 'center',
    borderRadius: 13,
    height: 43,
    justifyContent: 'center',
    width: 43,
  },
  summaryLabel: {
    color: '#7181A0',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  summaryTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    minHeight: 122,
    padding: 13,
    shadowColor: '#6A7EA5',
    shadowOffset: {height: 4, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 10,
    width: '47.5%',
  },
  summaryValue: {fontSize: 27, fontWeight: '900', marginTop: 11},
});
