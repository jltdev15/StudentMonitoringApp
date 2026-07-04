import React, {useCallback, useEffect, useState} from 'react';
import {ActivityCard} from '../../components/ActivityCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getActivitiesByClass} from '../../services/activityService';
import {getTeacherClasses} from '../../services/classService';
import {ActivityRecord} from '../../types/models';

export const ActivityHistoryScreen = () => {
  const {profile} = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const classes = await getTeacherClasses(profile.uid);
    const nextActivities = (
      await Promise.all(classes.map(item => getActivitiesByClass(item.id)))
    )
      .flat()
      .filter(activity => activity.status === 'closed');
    setActivities(nextActivities);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingState label="Loading activity history..." />;
  }

  return (
    <Screen>
      <AppHeader
        title="Activity History"
        subtitle="Review closed and completed activities."
      />
      {activities.length ? (
        activities.map(activity => (
          <ActivityCard key={activity.id} activity={activity} />
        ))
      ) : (
        <EmptyState
          title="No closed activities"
          message="Closed activities will appear here."
        />
      )}
    </Screen>
  );
};
