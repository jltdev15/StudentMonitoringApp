import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
        variant="teacher"
        title="Classes"
        subtitle="Manage your active classes."
        rightIcon="plus"
        onRightPress={() => navigation.navigate('AddClass')}
      />
      {classes.length ? (
        classes.map(item => (
          <AppCard
            key={item.id}
            style={styles.classCard}
            onPress={() =>
              navigation.navigate('ClassDetails', {classItem: item})
            }>
            <View style={styles.cardTopRow}>
              <View style={styles.classIcon}>
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={25}
                  color="#2563EB"
                />
              </View>
              <View style={styles.copy}>
                <Text variant="titleMedium" style={styles.title}>
                  {item.className}
                </Text>
                <Text numberOfLines={1} style={styles.meta}>
                  {item.subject} · {item.gradeLevel} - {item.section}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={25}
                color="#7181A0"
              />
            </View>
            <View style={styles.detailsRow}>
              <View style={styles.detailPill}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={15}
                  color="#2563EB"
                />
                <Text style={styles.detailText}>
                  {item.studentCount || 0} students
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.schedule}>
                {item.schedule || 'No schedule'}
              </Text>
            </View>
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
  cardTopRow: {alignItems: 'center', flexDirection: 'row'},
  classCard: {
    borderColor: '#EEF3FA',
    borderRadius: 20,
    marginBottom: 13,
    padding: 16,
  },
  classIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F0FF',
    borderRadius: 15,
    height: 52,
    justifyContent: 'center',
    marginRight: 13,
    width: 52,
  },
  copy: {flex: 1, minWidth: 0},
  detailsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  detailPill: {
    alignItems: 'center',
    backgroundColor: '#F1F6FF',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  detailText: {color: '#2563EB', fontSize: 12, fontWeight: '800'},
  meta: {
    color: '#7181A0',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  schedule: {color: '#7181A0', fontSize: 12, fontWeight: '700', maxWidth: 145},
  title: {
    color: '#112B5D',
    fontSize: 17,
    fontWeight: '900',
  },
});
