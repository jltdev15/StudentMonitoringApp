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
  ActivityCategory,
  ActivityRecord,
  ActivitySubmissionRecord,
} from '../../types/models';
import {StudentStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<StudentStackParamList, 'MyActivities'>;
type FeedFilter = 'all' | ActivityCategory;
type ActivityKind = ActivityCategory;

type ActivityFeedItem = {
  activity: ActivityRecord;
  kind: ActivityKind;
  submission?: ActivitySubmissionRecord;
  type: 'activity';
};

const filterTabs: {icon: string; key: FeedFilter; label: string}[] = [
  {icon: 'view-grid-outline', key: 'all', label: 'All'},
  {icon: 'clipboard-text-outline', key: 'peta', label: 'PETA'},
  {icon: 'file-question-outline', key: 'quiz', label: 'Quizzes'},
  {icon: 'code-tags', key: 'coding', label: 'Coding'},
];

const activityKind = (activity: ActivityRecord): ActivityKind =>
  activity.activityCategory ||
  (/quiz/i.test(`${activity.title} ${activity.description}`) ? 'quiz' : 'peta');

const dateFromValue = (value: ActivityRecord['dueDate']) => {
  if (!value) {
    return null;
  }
  return 'toDate' in value ? value.toDate() : value;
};

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
    ? {color: '#119C52', icon: 'file-question-outline', tint: '#EAF9F0'}
    : kind === 'coding'
    ? {color: '#7C3AED', icon: 'code-tags', tint: '#F3EDFF'}
    : {color: '#1767F4', icon: 'clipboard-text-outline', tint: '#EDF3FF'};

export const MyActivitiesScreen = ({navigation}: Props) => {
  const {profile, student} = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmissionRecord[]>(
    [],
  );
  const [filter, setFilter] = useState<FeedFilter>('all');
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
  const visibleActivities = useMemo(() => {
    const activityItems: ActivityFeedItem[] = activities.map(activity => ({
      activity,
      kind: activityKind(activity),
      submission: submissionByActivity[activity.id],
      type: 'activity',
    }));
    const matchingActivities = activityItems.filter(item =>
      filter === 'all' || filter === item.kind,
    );
    return matchingActivities.sort((first, second) => {
      const firstComplete = activityIsComplete(first.activity, first.submission);
      const secondComplete = activityIsComplete(second.activity, second.submission);
      if (firstComplete !== secondComplete) {
        return firstComplete ? 1 : -1;
      }
      const firstDate = dateFromValue(first.activity.dueDate)?.getTime() || 0;
      const secondDate = dateFromValue(second.activity.dueDate)?.getTime() || 0;
      return firstComplete ? secondDate - firstDate : firstDate - secondDate;
    });
  }, [activities, filter, submissionByActivity]);

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
    return (
      <Pressable
        accessibilityLabel={`Open activity ${activity.title}`}
        accessibilityRole="button"
        key={activity.id}
        onPress={() => navigation.navigate('StudentActivityDetails', {activity})}
        style={({pressed}) => [
          styles.feedCard,
          pressed && styles.pressed,
        ]}>
        <View style={[styles.feedIcon, {backgroundColor: style.tint}]}>
          <MaterialCommunityIcons name={style.icon} size={27} color={style.color} />
        </View>
        <View style={styles.feedCopy}>
          <View style={[styles.categoryChip, {backgroundColor: style.tint}]}>
            <Text style={[styles.categoryText, {color: style.color}]}>
              {kind === 'quiz'
                ? 'Quiz'
                : kind === 'coding'
                ? 'Coding'
                : 'PETA'}
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
                : kind === 'coding'
                ? styles.codingTodoStateText
                : styles.petaTodoStateText,
            ]}>
            {score || (completedActivity ? submissionStatusLabel(submission) : 'To Do')}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color="#7786A2"
          style={styles.rowChevron}
        />
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
              onPress={() => setFilter(tab.key)}
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

      {visibleActivities.length ? (
        visibleActivities.map(renderFeedItem)
      ) : (
        <View style={styles.inlineEmpty}>
          <Text style={styles.inlineEmptyText}>No activities available.</Text>
        </View>
      )}
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
  petaTodoStateText: {color: '#1767F4'},
  quizTodoStateText: {color: '#119C52'},
  codingTodoStateText: {color: '#7C3AED'},
  rowChevron: {marginLeft: 2},
  inlineEmpty: {alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 8, padding: 22},
  inlineEmptyText: {color: '#7181A0', fontSize: 13, fontWeight: '700'},
  pressed: {opacity: 0.74},
});
