import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../../services/activityService';
import {calculateAverageScore} from '../../services/reportService';
import {ActivityRecord, ActivitySubmissionRecord} from '../../types/models';

export const MyScoresScreen = () => {
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
    setSubmissions(
      nextSubmissions.filter(item => typeof item.score === 'number'),
    );
    setLoading(false);
  }, [profile, student]);

  useEffect(() => {
    load();
  }, [load]);

  const activityById = useMemo(
    () => Object.fromEntries(activities.map(item => [item.id, item])),
    [activities],
  );
  const average = calculateAverageScore(submissions, activities);

  if (loading) {
    return <LoadingState label="Loading scores..." />;
  }

  return (
    <Screen>
      <AppHeader
        title="My Scores"
        subtitle="See scored activities and your average."
      />
      <View style={styles.averageCard}>
        <View style={styles.averageIcon}>
          <MaterialCommunityIcons name="chart-line" size={30} color="#FFFFFF" />
        </View>
        <View style={styles.averageCopy}>
          <Text style={styles.averageLabel}>Average Score</Text>
          <Text style={styles.averageValue}>{average}%</Text>
          <Text style={styles.averageMeta}>
            Based on {submissions.length} scored activities
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Scored Activities</Text>
        <Text style={styles.sectionMeta}>{submissions.length} total</Text>
      </View>

      {submissions.length ? (
        submissions.map(submission => {
          const activity = activityById[submission.activityId];
          const total = activity?.totalPoints || 0;
          const score = submission.score || 0;
          const percentage = total ? Math.round((score / total) * 100) : 0;
          return (
            <AppCard key={submission.id} style={styles.scoreCard}>
              <View style={styles.scoreTopRow}>
                <View style={styles.scoreIcon}>
                  <MaterialCommunityIcons
                    name="star-check-outline"
                    size={24}
                    color="#2563EB"
                  />
                </View>
                <View style={styles.scoreCopy}>
                  <Text numberOfLines={2} style={styles.title}>
                    {activity?.title || 'Activity'}
                  </Text>
                  <Text style={styles.scoreText}>
                    {score} / {total} points
                  </Text>
                </View>
                <View style={styles.percentBadge}>
                  <Text style={styles.percent}>{percentage}%</Text>
                </View>
              </View>
              {submission.remarks ? (
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
          title="No scores yet"
          message="Scores appear after your teacher checks activities."
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  averageCard: {
    alignItems: 'center',
    backgroundColor: '#062A66',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    overflow: 'hidden',
    padding: 18,
  },
  averageCopy: {
    flex: 1,
    minWidth: 0,
  },
  averageIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  averageLabel: {
    color: '#E7EEFD',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  averageMeta: {
    color: '#E7EEFD',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  averageValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },
  percent: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '900',
  },
  percentBadge: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 18,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  scoreCard: {
    paddingVertical: 16,
  },
  scoreCopy: {
    flex: 1,
    minWidth: 0,
  },
  scoreIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  scoreText: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
  },
  scoreTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
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
});
