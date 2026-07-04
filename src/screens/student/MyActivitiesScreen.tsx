import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {useAuth} from '../../context/AuthContext';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../../services/activityService';
import {ActivityRecord, ActivitySubmissionRecord} from '../../types/models';
import {toReadableDate} from '../../utils/dateUtils';

const scoreLabel = (
  activity: ActivityRecord,
  submission?: ActivitySubmissionRecord,
) =>
  typeof submission?.score === 'number'
    ? `${submission.score} / ${activity.totalPoints}`
    : `- / ${activity.totalPoints}`;

export const MyActivitiesScreen = () => {
  const {profile, student} = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmissionRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const classIds = profile?.classIds?.length
      ? profile.classIds
      : student?.classIds || [];
    const studentId = profile?.studentId || student?.id;
    const [nextActivities, nextSubmissions] = await Promise.all([
      getActivitiesForClasses(classIds),
      studentId ? getSubmissionsByStudent(studentId) : Promise.resolve([]),
    ]);
    setActivities(nextActivities);
    setSubmissions(nextSubmissions);
    setLoading(false);
  }, [profile, student]);

  useEffect(() => {
    load();
  }, [load]);

  const submissionByActivity = useMemo(
    () => Object.fromEntries(submissions.map(item => [item.activityId, item])),
    [submissions],
  );

  if (loading) {
    return <LoadingState label="Loading activities..." />;
  }

  return (
    <Screen>
      <AppHeader
        title="My Activities"
        subtitle="Track complied, missing, late, and scored activities."
      />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Assigned Activities</Text>
        <Text style={styles.sectionMeta}>{activities.length} total</Text>
      </View>
      {activities.length ? (
        activities.map(activity => {
          const submission = submissionByActivity[activity.id];
          const status = submission?.status || 'missing';
          return (
            <AppCard key={activity.id} style={styles.activityCard}>
              <View style={styles.topRow}>
                <View style={styles.activityIcon}>
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={24}
                    color="#2563EB"
                  />
                </View>
                <View style={styles.titleBlock}>
                  <Text numberOfLines={2} style={styles.title}>
                    {activity.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.meta}>
                    Due {toReadableDate(activity.dueDate)} ·{' '}
                    {activity.totalPoints} pts
                  </Text>
                </View>
                <StatusBadge status={status} />
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Score</Text>
                  <Text style={styles.detailValue}>
                    {scoreLabel(activity, submission)}
                  </Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Compliance</Text>
                  <Text numberOfLines={1} style={styles.detailValue}>
                    {status === 'submitted' || status === 'late'
                      ? 'Complied'
                      : status}
                  </Text>
                </View>
              </View>

              {submission?.remarks ? (
                <View style={styles.remarksBox}>
                  <Text style={styles.remarksLabel}>Teacher Remarks</Text>
                  <Text style={styles.remarks}>{submission.remarks}</Text>
                </View>
              ) : null}
            </AppCard>
          );
        })
      ) : (
        <EmptyState
          title="No activities yet"
          message="Assigned activities will appear here."
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  activityCard: {
    paddingVertical: 16,
  },
  activityIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  detailBox: {
    backgroundColor: '#F6F9FE',
    borderColor: '#E8EDF5',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailLabel: {
    color: '#52617E',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  detailValue: {
    color: '#081638',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  meta: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  remarks: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 4,
  },
  remarksBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
  },
  remarksLabel: {
    color: '#52617E',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
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
  title: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
});
