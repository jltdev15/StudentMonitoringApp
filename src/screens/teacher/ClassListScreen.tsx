import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getTeacherClasses} from '../../services/classService';
import {getStudentsByClass} from '../../services/studentService';
import {ClassRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<TeacherStackParamList, 'ClassList'>;

export const ClassListScreen = ({navigation}: Props) => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) {
      return;
    }
    setLoading(true);
    const nextClasses = await getTeacherClasses(profile.uid);
    const withCounts = await Promise.all(
      nextClasses.map(async item => ({
        ...item,
        studentCount: (await getStudentsByClass(item.id)).length,
      })),
    );
    setClasses(withCounts);
    setLoading(false);
  }, [profile]);

  useEffect(() => navigation.addListener('focus', load), [load, navigation]);

  if (loading) {
    return <LoadingState label="Loading classes..." />;
  }

  return (
    <Screen>
      <AppHeader
        title="Classes"
        subtitle="Manage your active classes."
        rightIcon="plus"
        onRightPress={() => navigation.navigate('AddClass')}
      />
      {classes.length ? (
        classes.map(item => (
          <AppCard
            key={item.id}
            onPress={() =>
              navigation.navigate('ClassDetails', {classItem: item})
            }>
            <Text variant="titleMedium" style={styles.title}>
              {item.className}
            </Text>
            <Text style={styles.meta}>
              {item.subject} · {item.gradeLevel} - {item.section}
            </Text>
            <Text style={styles.subMeta}>
              {item.studentCount || 0} students ·{' '}
              {item.schedule || 'No schedule'}
            </Text>
          </AppCard>
        ))
      ) : (
        <EmptyState
          title="No classes yet"
          message="Tap the plus button to create your first class."
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  meta: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  subMeta: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  title: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
});
