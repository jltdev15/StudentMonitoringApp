import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getActivitySubmission} from '../../services/activityService';
import {ActivityCategory, ActivitySubmissionRecord} from '../../types/models';
import {StudentStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<
  StudentStackParamList,
  'StudentActivityDetails'
>;

const categoryDetails: Record<
  ActivityCategory,
  {color: string; icon: string; label: string; tint: string}
> = {
  coding: {color: '#7C3AED', icon: 'code-tags', label: 'Coding', tint: '#F3EDFF'},
  peta: {color: '#1767F4', icon: 'clipboard-text-outline', label: 'PETA', tint: '#EDF3FF'},
  quiz: {color: '#119C52', icon: 'file-question-outline', label: 'Quiz', tint: '#EAF9F0'},
};

const activityCategory = (title: string, description: string, category?: ActivityCategory) =>
  category || (/quiz/i.test(`${title} ${description}`) ? 'quiz' : 'peta');

const submissionLabel = (submission: ActivitySubmissionRecord | null) => {
  if (!submission) {
    return 'Not submitted yet';
  }
  if (typeof submission.score === 'number') {
    return 'Checked by your teacher';
  }
  return submission.status.charAt(0).toUpperCase() + submission.status.slice(1);
};

export const StudentActivityDetailsScreen = ({navigation, route}: Props) => {
  const {activity} = route.params;
  const {profile, student} = useAuth();
  const [submission, setSubmission] = useState<ActivitySubmissionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const studentId = profile?.studentId || student?.id;
  const category = useMemo(
    () => activityCategory(activity.title, activity.description, activity.activityCategory),
    [activity.activityCategory, activity.description, activity.title],
  );
  const categoryStyle = categoryDetails[category];

  const loadSubmission = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setSubmission(await getActivitySubmission(activity.id, studentId));
    } catch {
      setError('We could not load your submission status. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activity.id, studentId]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  if (loading) {
    return <LoadingState label="Loading activity details..." />;
  }

  if (error) {
    return (
      <Screen>
        <AppHeader title="Activity Details" subtitle={activity.title} />
        <EmptyState
          actionLabel="Try again"
          message={error}
          onAction={loadSubmission}
          title="Unable to load activity"
        />
      </Screen>
    );
  }

  const score =
    typeof submission?.score === 'number'
      ? `${submission.score}/${activity.totalPoints}`
      : null;
  const canSubmitImages = activity.acceptsImageAttachments && activity.status === 'active';

  return (
    <Screen>
      <AppHeader title="Activity Details" subtitle={activity.title} />
      <AppCard style={styles.activityCard}>
        <View style={[styles.iconTile, {backgroundColor: categoryStyle.tint}]}>
          <MaterialCommunityIcons color={categoryStyle.color} name={categoryStyle.icon} size={30} />
        </View>
        <View style={[styles.categoryChip, {backgroundColor: categoryStyle.tint}]}>
          <Text style={[styles.categoryText, {color: categoryStyle.color}]}>{categoryStyle.label}</Text>
        </View>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.description}>{activity.description || 'No instructions were provided.'}</Text>
      </AppCard>

      <AppCard style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons color="#286BE8" name="calendar-outline" size={20} />
          <View style={styles.detailCopy}><Text style={styles.detailLabel}>Due date</Text><Text style={styles.detailValue}>{toReadableDate(activity.dueDate)}</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <MaterialCommunityIcons color="#286BE8" name="star-outline" size={20} />
          <View style={styles.detailCopy}><Text style={styles.detailLabel}>Total points</Text><Text style={styles.detailValue}>{activity.totalPoints} points</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <MaterialCommunityIcons color="#286BE8" name="clipboard-check-outline" size={20} />
          <View style={styles.detailCopy}><Text style={styles.detailLabel}>Your status</Text><Text style={styles.detailValue}>{submissionLabel(submission)}</Text></View>
          {score ? <Text style={styles.score}>{score}</Text> : null}
        </View>
        {submission?.remarks ? (
          <><View style={styles.divider} /><View style={styles.remarks}><Text style={styles.detailLabel}>Teacher remarks</Text><Text style={styles.remarksText}>{submission.remarks}</Text></View></>
        ) : null}
      </AppCard>

      {canSubmitImages ? (
        <AppButton icon="image-plus" onPress={() => navigation.navigate('SubmitActivity', {activity})}>
          {submission ? 'Update Image Submission' : 'Submit Images'}
        </AppButton>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  activityCard: {alignItems: 'flex-start'},
  categoryChip: {borderRadius: 6, marginTop: 14, paddingHorizontal: 8, paddingVertical: 4},
  categoryText: {fontSize: 11, fontWeight: '900'},
  description: {color: '#526681', fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 8},
  detailCopy: {flex: 1, marginLeft: 11, minWidth: 0},
  detailLabel: {color: '#71809B', fontSize: 12, fontWeight: '700'},
  detailRow: {alignItems: 'center', flexDirection: 'row', minHeight: 54},
  detailsCard: {paddingHorizontal: 15},
  detailValue: {color: '#182C5B', fontSize: 14, fontWeight: '900', marginTop: 3},
  divider: {backgroundColor: '#E8EDF5', height: 1},
  iconTile: {alignItems: 'center', borderRadius: 14, height: 58, justifyContent: 'center', width: 58},
  remarks: {paddingVertical: 13},
  remarksText: {color: '#364C77', fontSize: 13, fontWeight: '600', lineHeight: 19, marginTop: 5},
  score: {color: '#159447', fontSize: 16, fontWeight: '900'},
  title: {color: '#102653', fontSize: 20, fontWeight: '900', marginTop: 10},
});
