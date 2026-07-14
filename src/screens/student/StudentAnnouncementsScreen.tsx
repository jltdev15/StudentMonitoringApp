import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getAnnouncementsForStudent} from '../../services/announcementService';
import {AnnouncementRecord} from '../../types/models';

export const StudentAnnouncementsScreen = () => {
  const {profile, student} = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const classIds = profile?.classIds?.length
      ? profile.classIds
      : student?.classIds || [];
    setLoading(true);
    setError('');
    try {
      setAnnouncements(await getAnnouncementsForStudent(classIds));
    } catch {
      setError('We could not load announcements. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile, student]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingState label="Loading announcements..." />;
  }

  if (error) {
    return (
      <Screen>
        <AppHeader title="Announcements" subtitle="Class and school updates." />
        <EmptyState
          title="Unable to load announcements"
          message={error}
          actionLabel="Try again"
          onAction={load}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Announcements" subtitle="Class and school updates." />
      {announcements.length ? (
        announcements.map(item => (
          <AppCard key={item.id}>
            <Text variant="titleMedium" style={styles.title}>
              {item.title}
            </Text>
            <Text style={styles.message}>{item.message}</Text>
          </AppCard>
        ))
      ) : (
        <EmptyState title="No announcements" />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  message: {
    color: '#3B4968',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 8,
  },
  title: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
});
