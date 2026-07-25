import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Searchbar} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {StudentListItem} from '../../components/StudentListItem';
import {useAuth} from '../../context/AuthContext';
import {getTeacherClasses} from '../../services/classService';
import {getStudentsByClass} from '../../services/studentService';
import {StudentRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<TeacherStackParamList, 'StudentList'>;

export const StudentListScreen = ({route, navigation}: Props) => {
  const {profile} = useAuth();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) {
      return;
    }
    setLoading(true);
    const classId = route.params?.classId;
    if (classId) {
      setStudents(await getStudentsByClass(classId));
    } else {
      const classes = await getTeacherClasses(profile.uid);
      const all = (
        await Promise.all(classes.map(item => getStudentsByClass(item.id)))
      ).flat();
      setStudents(
        Array.from(new Map(all.map(item => [item.id, item])).values()),
      );
    }
    setLoading(false);
  }, [profile, route.params?.classId]);

  useEffect(() => navigation.addListener('focus', load), [load, navigation]);

  const filtered = useMemo(
    () =>
      students.filter(student =>
        `${student.fullName} ${student.studentNumber}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, students],
  );

  if (loading) {
    return <LoadingState label="Loading students..." />;
  }

  return (
    <View style={styles.root}>
      <View
        testID="students-sticky-header"
        style={[styles.stickyHeader, {paddingTop: insets.top + 20}]}>
        <AppHeader
          variant="teacher"
          titleInline
          title="Students"
          subtitle="Search and manage student records."
          showBack={false}
        />
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}>
        <Searchbar
          value={query}
          onChangeText={setQuery}
          placeholder="Search students"
          style={styles.search}
        />
        {filtered.length ? (
          filtered.map(student => (
            <StudentListItem
              key={student.id}
              student={student}
              variant="teacher"
              onPress={() =>
                navigation.navigate('TeacherStudentProfile', {student})
              }
            />
          ))
        ) : (
          <EmptyState
            title="No students found"
            message="Add students manually or adjust your search."
          />
        )}
      </ScrollView>
      <Pressable
        accessibilityLabel="Add student"
        accessibilityRole="button"
        onPress={() =>
          navigation.navigate('AddStudent', {classId: route.params?.classId})
        }
        style={({pressed}) => [
          styles.floatingButton,
          pressed && styles.pressed,
        ]}>
        <MaterialCommunityIcons name="account-plus" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 30,
    bottom: 20,
    elevation: 8,
    height: 60,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#174EA6',
    shadowOffset: {height: 6, width: 0},
    shadowOpacity: 0.32,
    shadowRadius: 10,
    width: 60,
  },
  pressed: {opacity: 0.82, transform: [{scale: 0.96}]},
  root: {backgroundColor: '#F6F9FE', flex: 1},
  scroll: {backgroundColor: '#F6F9FE', flex: 1},
  content: {padding: 20, paddingBottom: 116},
  search: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 16,
    minHeight: 54,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  stickyHeader: {
    backgroundColor: '#F6F9FE',
    paddingHorizontal: 20,
    zIndex: 2,
  },
});
