import React, {useState} from 'react';
import {Alert, Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ActionRow} from '../../components/ActionRow';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {closeActivity, deleteActivity} from '../../services/activityService';
import {TeacherStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'ActivityDetails'>;

export const ActivityDetailsScreen = ({route, navigation}: Props) => {
  const {activity} = route.params;
  const [deleting, setDeleting] = useState(false);

  const removeActivity = async () => {
    if (deleting) {
      return;
    }
    setDeleting(true);
    try {
      await deleteActivity(activity.id);
      navigation.navigate('ActivityList', {classId: activity.classId});
    } catch (removeError) {
      Alert.alert(
        'Unable to delete activity',
        removeError instanceof Error
          ? removeError.message
          : 'Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (deleting) {
      return;
    }
    Alert.alert(
      'Delete activity?',
      `This permanently removes ${activity.title} and all recorded submissions and scores. This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeActivity();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <AppHeader
        title={activity.title}
        subtitle={`Due ${toReadableDate(activity.dueDate)} · ${
          activity.totalPoints
        } points`}
      />
      <AppCard>
        <Text style={styles.description}>
          {activity.description || 'No description provided.'}
        </Text>
        <Text style={styles.meta}>Status: {activity.status}</Text>
        <Text style={styles.meta}>
          Image submissions:{' '}
          {activity.acceptsImageAttachments ? 'Accepted' : 'Not accepted'}
        </Text>
      </AppCard>
      <ActionRow
        icon="playlist-edit"
        label="Record Status and Scores"
        primary
        onPress={() => navigation.navigate('ScoreEncoding', {activity})}
      />
      {activity.status === 'active' ? (
        <ActionRow
          icon="pencil-outline"
          label="Edit Activity"
          onPress={() => navigation.navigate('EditActivity', {activity})}
        />
      ) : null}
      <ActionRow
        icon="lock-outline"
        label="Close Activity"
        onPress={async () => {
          await closeActivity(activity.id);
          navigation.goBack();
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete activity"
        disabled={deleting}
        onPress={confirmDelete}
        style={({pressed}) => [
          styles.deleteAction,
          deleting && styles.deleteActionDisabled,
          pressed && styles.deleteActionPressed,
        ]}>
        <View style={styles.deleteIconWrap}>
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={24}
            color="#DC2626"
          />
        </View>
        <View style={styles.deleteCopy}>
          <Text style={styles.deleteTitle}>Delete Activity</Text>
          <Text style={styles.deleteSubtitle}>
            Permanently remove this activity and its scores.
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={26}
          color="#DC2626"
        />
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  description: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  deleteAction: {
    alignItems: 'center',
    backgroundColor: '#FFF7F7',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
    minHeight: 76,
    paddingHorizontal: 16,
  },
  deleteActionPressed: {
    opacity: 0.78,
  },
  deleteActionDisabled: {
    opacity: 0.55,
  },
  deleteCopy: {
    flex: 1,
    minWidth: 0,
  },
  deleteIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  deleteSubtitle: {
    color: '#9F1239',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 3,
  },
  deleteTitle: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '900',
  },
  meta: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    textTransform: 'capitalize',
  },
});
