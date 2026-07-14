import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getTeacherClasses} from '../../services/classService';
import {getTeacherAnnouncements} from '../../services/announcementService';
import {AnnouncementRecord, ClassRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';
import {toReadableDate} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'AnnouncementHistory'>;

export const AnnouncementHistoryScreen = ({navigation}: Props) => {
  const {profile} = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [nextAnnouncements, nextClasses] = await Promise.all([
        getTeacherAnnouncements(profile.uid),
        getTeacherClasses(profile.uid),
      ]);
      setAnnouncements(nextAnnouncements);
      setClasses(nextClasses);
    } catch {
      setError('We could not load your announcement history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => navigation.addListener('focus', load), [load, navigation]);

  if (loading) {
    return <LoadingState label="Loading announcement history..." />;
  }

  if (error) {
    return (
      <Screen>
        <AppHeader
          title="Announcement History"
          subtitle="Review and update announcements you have posted."
        />
        <EmptyState
          title="Unable to load history"
          message={error}
          actionLabel="Try again"
          onAction={load}
        />
      </Screen>
    );
  }

  const classNameFor = (announcement: AnnouncementRecord) =>
    classes.find(item => item.id === announcement.classId)?.className ||
    'Class announcement';

  return (
    <Screen>
      <AppHeader
        title="Announcement History"
        subtitle="Review and update announcements you have posted."
      />
      {announcements.length ? (
        announcements.map(announcement => {
          const isClassAnnouncement = Boolean(announcement.classId);
          return (
            <Pressable
              key={announcement.id}
              accessibilityLabel={`Edit ${announcement.title}`}
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('EditAnnouncement', {announcement})
              }
              style={({pressed}) => [
                styles.announcementCard,
                pressed && styles.announcementCardPressed,
              ]}>
              <View style={styles.cardTopRow}>
                <View style={styles.audienceIcon}>
                  <MaterialCommunityIcons
                    name={
                      isClassAnnouncement
                        ? 'school-outline'
                        : 'account-group-outline'
                    }
                    size={22}
                    color="#2563EB"
                  />
                </View>
                <View style={styles.cardCopy}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {announcement.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.cardAudience}>
                    {isClassAnnouncement
                      ? classNameFor(announcement)
                      : 'All students'}
                  </Text>
                </View>
                <View style={styles.editIcon}>
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={21}
                    color="#2563EB"
                  />
                </View>
              </View>
              <Text numberOfLines={3} style={styles.cardMessage}>
                {announcement.message}
              </Text>
              <Text style={styles.cardDate}>
                Posted {toReadableDate(announcement.createdAt)}
              </Text>
            </Pressable>
          );
        })
      ) : (
        <EmptyState
          title="No announcements yet"
          message="Announcements you post will appear here."
          actionLabel="Post announcement"
          onAction={() => navigation.navigate('Announcements')}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  announcementCardPressed: {
    opacity: 0.82,
  },
  audienceIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardAudience: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardDate: {
    color: '#71809B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  cardMessage: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 14,
  },
  cardTitle: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  editIcon: {
    alignItems: 'center',
    backgroundColor: '#F2F6FF',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
});
