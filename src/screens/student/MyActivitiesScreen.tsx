import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../../services/activityService';
import {
  ActivityRecord,
  ActivitySubmissionRecord,
} from '../../types/models';
import {StudentStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<StudentStackParamList, 'MyActivities'>;
type FeedFilter = 'all' | 'assignment' | 'quiz';
type ActivityKind = 'assignment' | 'quiz';

type ActivityFeedItem = {
  activity: ActivityRecord;
  kind: ActivityKind;
  submission?: ActivitySubmissionRecord;
  type: 'activity';
};

const visibleLimit = 3;

const filterTabs: {icon: string; key: FeedFilter; label: string}[] = [
  {icon: 'view-grid-outline', key: 'all', label: 'All'},
  {icon: 'clipboard-text-outline', key: 'assignment', label: 'Assignments'},
  {icon: 'help-circle-outline', key: 'quiz', label: 'Quizzes'},
];

const activityKind = (activity: ActivityRecord): ActivityKind =>
  /quiz/i.test(`${activity.title} ${activity.description}`) ? 'quiz' : 'assignment';

const dateFromValue = (value: ActivityRecord['dueDate']) => {
  if (!value) {
    return null;
  }
  return 'toDate' in value ? value.toDate() : value;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const activityIsComplete = (
  activity: ActivityRecord,
  submission?: ActivitySubmissionRecord,
) =>
  activity.status === 'closed' ||
  Boolean(submission) &&
    (submission?.status === 'submitted' ||
      submission?.status === 'late' ||
      submission?.status === 'excused' ||
      typeof submission?.score === 'number');

const submissionStatusLabel = (submission?: ActivitySubmissionRecord) => {
  if (typeof submission?.score === 'number') {
    return 'Score';
  }
  if (submission?.status === 'late') {
    return 'Late';
  }
  if (submission?.status === 'excused') {
    return 'Excused';
  }
  return 'Submitted';
};

const kindStyle = (kind: ActivityKind) =>
  kind === 'quiz'
    ? {color: '#119C52', icon: 'help-circle-outline', tint: '#EAF9F0'}
    : {color: '#1767F4', icon: 'clipboard-text-outline', tint: '#EDF3FF'};

export const MyActivitiesScreen = ({navigation}: Props) => {
  const {profile, student} = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmissionRecord[]>(
    [],
  );
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const classIds = profile?.classIds?.length
      ? profile.classIds
      : student?.classIds || [];
    const studentId = profile?.studentId || student?.id;
    setLoading(true);
    setError('');
    try {
      const [nextActivities, nextSubmissions] = await Promise.all([
        getActivitiesForClasses(classIds),
        studentId ? getSubmissionsByStudent(studentId) : Promise.resolve([]),
      ]);
      setActivities(nextActivities);
      setSubmissions(nextSubmissions);
    } catch {
      setError('We could not load your activities. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile, student]);

  useEffect(() => navigation.addListener('focus', load), [load, navigation]);

  const submissionByActivity = useMemo(
    () => Object.fromEntries(submissions.map(item => [item.activityId, item])),
    [submissions],
  );
  const today = useMemo(() => startOfDay(new Date()), []);

  const {completed, upcoming} = useMemo(() => {
    const activityItems: ActivityFeedItem[] = activities.map(activity => ({
      activity,
      kind: activityKind(activity),
      submission: submissionByActivity[activity.id],
      type: 'activity',
    }));
    const matchingActivities = activityItems.filter(item =>
      filter === 'all' || filter === item.kind,
    );
    const upcomingActivities = matchingActivities
      .filter(item => {
        const dueDate = dateFromValue(item.activity.dueDate);
        return (
          !activityIsComplete(item.activity, item.submission) &&
          dueDate !== null &&
          startOfDay(dueDate).getTime() >= today.getTime()
        );
      })
      .sort(
        (first, second) =>
          (dateFromValue(first.activity.dueDate)?.getTime() || 0) -
          (dateFromValue(second.activity.dueDate)?.getTime() || 0),
      );
    const completedActivities = matchingActivities
      .filter(item => activityIsComplete(item.activity, item.submission))
      .sort(
        (first, second) =>
          (dateFromValue(second.activity.dueDate)?.getTime() || 0) -
          (dateFromValue(first.activity.dueDate)?.getTime() || 0),
      );
    return {
      completed: completedActivities,
      upcoming: upcomingActivities,
    };
  }, [activities, filter, submissionByActivity, today]);

  const visibleUpcoming = showAllUpcoming
    ? upcoming
    : upcoming.slice(0, visibleLimit);
  const visibleCompleted = showAllCompleted
    ? completed
    : completed.slice(0, visibleLimit);

  const selectFilter = (nextFilter: FeedFilter) => {
    setFilter(nextFilter);
    setShowAllUpcoming(false);
    setShowAllCompleted(false);
  };

  if (loading) {
    return <LoadingState label="Loading activities..." />;
  }

  if (error) {
    return (
      <Screen>
        <AppHeader
          title="My Activities"
          subtitle="Track complied, missing, late, and scored activities."
          showBack={false}
        />
        <EmptyState
          title="Unable to load activities"
          message={error}
          actionLabel="Try again"
          onAction={load}
        />
      </Screen>
    );
  }

  const renderFeedItem = (item: ActivityFeedItem) => {
    const {activity, kind, submission} = item;
    const style = kindStyle(kind);
    const completedActivity = activityIsComplete(activity, submission);
    const score =
      typeof submission?.score === 'number'
        ? `${submission.score}/${activity.totalPoints}`
        : null;
    const canOpenSubmission = activity.acceptsImageAttachments;

    return (
      <Pressable
        accessibilityLabel={
          canOpenSubmission
            ? `Open activity ${activity.title}`
            : `Activity ${activity.title}`
        }
        accessibilityRole={canOpenSubmission ? 'button' : undefined}
        disabled={!canOpenSubmission}
        key={activity.id}
        onPress={
          canOpenSubmission
            ? () => navigation.navigate('SubmitActivity', {activity})
            : undefined
        }
        style={({pressed}) => [
          styles.feedCard,
          canOpenSubmission && pressed && styles.pressed,
        ]}>
        <View style={[styles.feedIcon, {backgroundColor: style.tint}]}>
          <MaterialCommunityIcons name={style.icon} size={27} color={style.color} />
        </View>
        <View style={styles.feedCopy}>
          <View style={[styles.categoryChip, {backgroundColor: style.tint}]}>
            <Text style={[styles.categoryText, {color: style.color}]}>
              {kind === 'quiz' ? 'Quiz' : 'Assignment'}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.feedTitle}>
            {activity.title}
          </Text>
          <Text numberOfLines={1} style={styles.feedDescription}>
            {activity.description || 'Class activity'}
          </Text>
          <View style={styles.dateRow}>
            <MaterialCommunityIcons
              name={completedActivity ? 'check-circle' : 'calendar-month-outline'}
              size={13}
              color={completedActivity ? '#16A34A' : '#7A8AA7'}
            />
            <Text style={styles.dateText}>
              {completedActivity && submission?.submittedAt
                ? `Submitted ${toReadableDate(submission.submittedAt)}`
                : `Due ${toReadableDate(activity.dueDate)}`}
            </Text>
          </View>
          {submission?.remarks ? (
            <Text numberOfLines={1} style={styles.remarks}>
              {submission.remarks}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.stateChip,
            completedActivity ? styles.scoreChip : styles.todoChip,
          ]}>
          <Text
            style={[
              styles.stateText,
              completedActivity
                ? styles.completedStateText
                : kind === 'quiz'
                ? styles.quizTodoStateText
                : styles.assignmentTodoStateText,
            ]}>
            {score || (completedActivity ? submissionStatusLabel(submission) : 'To Do')}
          </Text>
        </View>
        {completedActivity ? (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#7786A2"
            style={styles.rowChevron}
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Screen>
      <AppHeader
        title="My Activities"
        subtitle="Track complied, missing, late, and scored activities."
        showBack={false}
      />

      <View style={styles.filterBar}>
        {filterTabs.map(tab => {
          const selected = filter === tab.key;
          return (
            <Pressable
              accessibilityLabel={tab.label}
              accessibilityRole="button"
              accessibilityState={{selected}}
              key={tab.key}
              onPress={() => selectFilter(tab.key)}
              style={({pressed}) => [
                styles.filterTab,
                selected && styles.filterTabActive,
                pressed && styles.pressed,
              ]}>
              <MaterialCommunityIcons
                name={tab.icon}
                size={19}
                color={selected ? '#1767F4' : '#697A9A'}
              />
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={[styles.filterLabel, selected && styles.filterLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Upcoming
        </Text>
        {upcoming.length > visibleLimit ? (
          <Pressable
            accessibilityLabel={
              showAllUpcoming ? 'Show fewer upcoming items' : 'View all upcoming items'
            }
            accessibilityRole="button"
            onPress={() => setShowAllUpcoming(current => !current)}
            style={({pressed}) => [styles.viewAllButton, pressed && styles.pressed]}>
            <Text style={styles.viewAllText}>
              {showAllUpcoming ? 'Show less' : 'View all'}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#1767F4"
            />
          </Pressable>
        ) : null}
      </View>
      {visibleUpcoming.length ? (
        visibleUpcoming.map(renderFeedItem)
      ) : (
        <View style={styles.inlineEmpty}>
          <Text style={styles.inlineEmptyText}>
            No upcoming items.
          </Text>
        </View>
      )}

      <>
          <View style={[styles.sectionHeader, styles.completedHeader]}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completed.length > visibleLimit ? (
              <Pressable
                accessibilityLabel={
                  showAllCompleted
                    ? 'Show fewer completed items'
                    : 'View all completed items'
                }
                accessibilityRole="button"
                onPress={() => setShowAllCompleted(current => !current)}
                style={({pressed}) => [
                  styles.viewAllButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.viewAllText}>
                  {showAllCompleted ? 'Show less' : 'View all'}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#1767F4"
                />
              </Pressable>
            ) : null}
          </View>
          {visibleCompleted.length ? (
            visibleCompleted.map(renderFeedItem)
          ) : (
            <View style={styles.inlineEmpty}>
              <Text style={styles.inlineEmptyText}>No completed activities.</Text>
            </View>
          )}
      </>
    </Screen>
  );
};

const styles = StyleSheet.create({
  filterBar: {
    backgroundColor: '#F8FAFE',
    borderColor: '#E2E9F5',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 24,
    padding: 4,
  },
  filterTab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBDCFC',
    borderRadius: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#7890B8',
    shadowOffset: {height: 2, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  filterLabel: {color: '#697A9A', fontSize: 10, fontWeight: '800', marginTop: 4},
  filterLabelActive: {color: '#1767F4', fontWeight: '900'},
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  completedHeader: {marginTop: 29},
  sectionTitle: {color: '#102653', fontSize: 18, fontWeight: '900'},
  viewAllButton: {alignItems: 'center', flexDirection: 'row'},
  viewAllText: {color: '#1767F4', fontSize: 12, fontWeight: '900'},
  feedCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F8',
    borderRadius: 15,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    marginBottom: 9,
    minHeight: 112,
    padding: 12,
    shadowColor: '#6E80A0',
    shadowOffset: {height: 4, width: 0},
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  feedIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  feedCopy: {flex: 1, marginLeft: 11, minWidth: 0},
  categoryChip: {alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3},
  categoryText: {fontSize: 10, fontWeight: '900'},
  feedTitle: {color: '#162A55', fontSize: 14, fontWeight: '900', marginTop: 6},
  feedDescription: {color: '#657595', fontSize: 11, fontWeight: '600', lineHeight: 15, marginTop: 3},
  dateRow: {alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 6},
  dateText: {color: '#7383A1', fontSize: 10, fontWeight: '700'},
  remarks: {color: '#526F9F', fontSize: 10, fontStyle: 'italic', fontWeight: '600', marginTop: 4},
  stateChip: {alignItems: 'center', borderRadius: 7, justifyContent: 'center', marginLeft: 6, paddingHorizontal: 8, paddingVertical: 7},
  todoChip: {backgroundColor: '#EDF3FF'},
  scoreChip: {backgroundColor: '#EAF9F0'},
  stateText: {fontSize: 10, fontWeight: '900'},
  completedStateText: {color: '#159447'},
  assignmentTodoStateText: {color: '#1767F4'},
  quizTodoStateText: {color: '#119C52'},
  rowChevron: {marginLeft: 2},
  inlineEmpty: {alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 8, padding: 22},
  inlineEmptyText: {color: '#7181A0', fontSize: 13, fontWeight: '700'},
  pressed: {opacity: 0.74},
});
