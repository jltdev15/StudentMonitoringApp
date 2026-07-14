import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Menu, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
  const [classesLoading, setClassesLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const loadClasses = useCallback(async () => {
    if (!profile) {
      setClasses([]);
      setClassesLoading(false);
      return;
    }
    setClassesLoading(true);
    try {
      const nextClasses = await getTeacherClasses(profile.uid);
      setClasses(nextClasses);
      if (!classId) {
        setClassId(nextClasses[0]?.id || '');
      } else {
        setActivityRefreshKey(current => current + 1);
      }
    } catch {
      setClasses([]);
      setActivities([]);
    } finally {
      setClassesLoading(false);
    }
  }, [classId, profile]);

  useEffect(
    () => navigation.addListener('focus', loadClasses),
    [loadClasses, navigation],
  );

  useEffect(() => {
    if (!classId) {
      setActivities([]);
      setActivitiesLoading(false);
      return;
    }

    let cancelled = false;
    const loadActivities = async () => {
      setActivitiesLoading(true);
      setActivities([]);
      try {
        const nextActivities = await getActivitiesByClass(classId);
        if (!cancelled) {
          setActivities(nextActivities);
        }
      } catch {
        if (!cancelled) {
          setActivities([]);
        }
      } finally {
        if (!cancelled) {
          setActivitiesLoading(false);
        }
      }
    };

    loadActivities();
    return () => {
      cancelled = true;
    };
  }, [activityRefreshKey, classId]);

  const selectClass = (nextClassId: string) => {
    if (nextClassId === classId) {
      setMenuVisible(false);
      return;
    }
    setActivities([]);
    setActivitiesLoading(true);
    setClassId(nextClassId);
    setMenuVisible(false);
  };

  const selectedClass = classes.find(item => item.id === classId);

  if (classesLoading || activitiesLoading) {
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
      {classes.length ? (
        <View style={styles.classSection}>
          <Text style={styles.sectionTitle}>Class</Text>
          <Text style={styles.sectionSubtitle}>
            Choose a class to view its activities.
          </Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Pressable
                accessibilityRole="button"
                onPress={() => setMenuVisible(true)}
                style={({pressed}) => [
                  styles.selectorCard,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.selectorIcon}>
                  <MaterialCommunityIcons
                    name="school-outline"
                    size={24}
                    color="#2563EB"
                  />
                </View>
                <View style={styles.selectorCopy}>
                  <Text style={styles.selectorLabel}>Selected class</Text>
                  <Text numberOfLines={1} style={styles.selectorTitle}>
                    {selectedClass ? selectedClass.className : 'Select class'}
                  </Text>
                  <Text numberOfLines={1} style={styles.selectorMeta}>
                    {selectedClass
                      ? `${selectedClass.subject} · ${selectedClass.section}`
                      : 'Choose a class to view activities'}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color="#52617E"
                />
              </Pressable>
            }>
            {classes.map(item => (
              <Menu.Item
                key={item.id}
                title={`${item.className} · ${item.section}`}
                onPress={() => selectClass(item.id)}
              />
            ))}
          </Menu>
        </View>
      ) : (
        <EmptyState
          title="Create a class first"
          message="A class is required before you can create or view activities."
        />
      )}
      {classes.length && activities.length ? (
        activities.map(activity => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onPress={() => navigation.navigate('ActivityDetails', {activity})}
          />
        ))
      ) : classes.length ? (
        <EmptyState
          title="No activities yet"
          message="Create an activity for the selected class."
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  classSection: {
    marginBottom: 18,
  },
  pressed: {
    opacity: 0.82,
  },
  sectionSubtitle: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
  selectorCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  selectorCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectorIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  selectorLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  selectorMeta: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  selectorTitle: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
});
