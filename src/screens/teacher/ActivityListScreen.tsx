import React, {useCallback, useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Menu} from 'react-native-paper';
import {ActivityCard} from '../../components/ActivityCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getActivitiesByClass} from '../../services/activityService';
import {getTeacherClasses} from '../../services/classService';
import {ActivityRecord, ClassRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<TeacherStackParamList, 'ActivityList'>;

export const ActivityListScreen = ({route, navigation}: Props) => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState(route.params?.classId || '');
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) {
      return;
    }
    setLoading(true);
    const nextClasses = await getTeacherClasses(profile.uid);
    setClasses(nextClasses);
    const activeClassId = classId || nextClasses[0]?.id || '';
    if (!classId) {
      setClassId(activeClassId);
    }
    setActivities(
      activeClassId ? await getActivitiesByClass(activeClassId) : [],
    );
    setLoading(false);
  }, [classId, profile]);

  useEffect(() => navigation.addListener('focus', load), [load, navigation]);

  const selectedClass = classes.find(item => item.id === classId);

  if (loading) {
    return <LoadingState label="Loading activities..." />;
  }

  return (
    <Screen>
      <AppHeader
        title="Activities"
        subtitle={selectedClass?.className || 'Select class'}
        rightIcon="plus"
        onRightPress={() => navigation.navigate('CreateActivity', {classId})}
      />
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setMenuVisible(true)}>
            {selectedClass ? selectedClass.className : 'Select class'}
          </Button>
        }>
        {classes.map(item => (
          <Menu.Item
            key={item.id}
            title={item.className}
            onPress={() => {
              setClassId(item.id);
              setMenuVisible(false);
            }}
          />
        ))}
      </Menu>
      {activities.length ? (
        activities.map(activity => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={() => navigation.navigate('ActivityDetails', {activity})}
          />
        ))
      ) : (
        <EmptyState
          title="No activities yet"
          message="Create an activity for the selected class."
        />
      )}
    </Screen>
  );
};
