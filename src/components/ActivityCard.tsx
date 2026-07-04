import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ActivityRecord} from '../types/models';
import {toReadableDate} from '../utils/dateUtils';
import {AppCard} from './AppCard';
import {StatusBadge} from './StatusBadge';

type Props = {
  activity: ActivityRecord;
  onPress?: () => void;
};

export const ActivityCard = ({activity, onPress}: Props) => (
  <AppCard onPress={onPress}>
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name="file-document-outline"
          size={26}
          color="#2563EB"
        />
      </View>
      <View style={styles.text}>
        <Text variant="titleMedium" style={styles.title}>
          {activity.title}
        </Text>
        <Text style={styles.meta}>
          Due {toReadableDate(activity.dueDate)} · {activity.totalPoints} pts
        </Text>
      </View>
      <StatusBadge status={activity.status} />
    </View>
    {activity.description ? (
      <Text style={styles.description}>{activity.description}</Text>
    ) : null}
  </AppCard>
);

const styles = StyleSheet.create({
  description: {
    color: '#3B4968',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginRight: 14,
    width: 52,
  },
  meta: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
});
