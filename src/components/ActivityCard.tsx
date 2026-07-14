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
    color: '#7181A0',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 9,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 15,
    height: 48,
    justifyContent: 'center',
    marginRight: 14,
    width: 48,
  },
  meta: {
    color: '#7181A0',
    fontSize: 13,
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
    color: '#112B5D',
    fontSize: 16,
    fontWeight: '900',
  },
});
