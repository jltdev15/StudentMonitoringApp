import React from 'react';
import {StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {StudentStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<
  StudentStackParamList,
  'StudentAnnouncementDetails'
>;

const announcementStyles = {
  Academic: {
    background: '#E6F0FF',
    color: '#2166D8',
    icon: 'book-open-page-variant-outline',
  },
  Events: {
    background: '#E5F9ED',
    color: '#129B4A',
    icon: 'calendar-check-outline',
  },
  General: {
    background: '#F1E8FF',
    color: '#7B3FF2',
    icon: 'bullhorn-outline',
  },
} as const;

export const StudentAnnouncementDetailsScreen = ({route}: Props) => {
  const {announcement} = route.params;
  const type = announcement.announcementType || 'General';
  const typeStyle = announcementStyles[type];

  return (
    <Screen>
      <AppHeader title="Announcement" subtitle="Class and school update" />
      <AppCard style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, {backgroundColor: typeStyle.background}]}>
            <MaterialCommunityIcons
              color={typeStyle.color}
              name={typeStyle.icon}
              size={14}
            />
            <Text style={[styles.typeLabel, {color: typeStyle.color}]}>
              {type}
            </Text>
          </View>
          {announcement.featured ? (
            <View style={styles.featuredBadge}>
              <MaterialCommunityIcons color="#9A6800" name="star" size={13} />
              <Text style={styles.featuredLabel}>FEATURED</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title}>{announcement.title}</Text>
        <View style={styles.dateRow}>
          <MaterialCommunityIcons
            color="#657797"
            name="calendar-blank-outline"
            size={16}
          />
          <Text style={styles.date}>
            Posted {toReadableDate(announcement.createdAt)}
          </Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.messageLabel}>MESSAGE</Text>
        <Text style={styles.message}>{announcement.message}</Text>
      </AppCard>
    </Screen>
  );
};

const styles = StyleSheet.create({
  badgeRow: {alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  card: {padding: 22},
  date: {color: '#657797', fontSize: 13, fontWeight: '700'},
  dateRow: {alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 13},
  divider: {backgroundColor: '#E5ECF6', height: 1, marginVertical: 22},
  featuredBadge: {alignItems: 'center', backgroundColor: '#FFF7DE', borderColor: '#F2D37B', borderRadius: 7, borderWidth: 1, flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 4},
  featuredLabel: {color: '#9A6800', fontSize: 10, fontWeight: '900', letterSpacing: 0.45},
  message: {color: '#314665', fontSize: 16, lineHeight: 26},
  messageLabel: {color: '#71819D', fontSize: 11, fontWeight: '900', letterSpacing: 0.7, marginBottom: 10},
  title: {color: '#11285B', fontSize: 25, fontWeight: '900', letterSpacing: -0.45, lineHeight: 32, marginTop: 15},
  typeBadge: {alignItems: 'center', borderRadius: 7, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 5},
  typeLabel: {fontSize: 11, fontWeight: '900'},
});
