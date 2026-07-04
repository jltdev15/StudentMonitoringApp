import React from 'react';
import {StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import {ActionRow} from '../../components/ActionRow';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {closeActivity} from '../../services/activityService';
import {TeacherStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'ActivityDetails'>;

export const ActivityDetailsScreen = ({route, navigation}: Props) => {
  const {activity} = route.params;
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
      </AppCard>
      <ActionRow
        icon="playlist-edit"
        label="Record Status and Scores"
        primary
        onPress={() => navigation.navigate('ScoreEncoding', {activity})}
      />
      <ActionRow
        icon="lock-outline"
        label="Close Activity"
        onPress={async () => {
          await closeActivity(activity.id);
          navigation.goBack();
        }}
      />
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
  meta: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    textTransform: 'capitalize',
  },
});
