import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Searchbar} from 'react-native-paper';
import {AppButton} from '../../components/AppButton';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {StudentListItem} from '../../components/StudentListItem';
import {useAuth} from '../../context/AuthContext';
import {getTeacherClasses} from '../../services/classService';
import {getStudentsByClass} from '../../services/studentService';
import {StudentRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<TeacherStackParamList, 'StudentList'>;

export const StudentListScreen = ({route, navigation}: Props) => {
  const {profile} = useAuth();
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
    <Screen>
      <AppHeader
        title="Students"
        subtitle="Search and manage student records."
        rightIcon="account-plus"
        onRightPress={() =>
          navigation.navigate('AddStudent', {classId: route.params?.classId})
        }
      />
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
      <AppButton
        icon="account-plus"
        onPress={() =>
          navigation.navigate('AddStudent', {classId: route.params?.classId})
        }>
        Add Student
      </AppButton>
      <AppButton
        icon="file-upload-outline"
        mode="outlined"
        onPress={() =>
          navigation.navigate('ImportStudentRoster', {
            classId: route.params?.classId,
          })
        }>
        Import Roster
      </AppButton>
    </Screen>
  );
};

const styles = StyleSheet.create({
  search: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
});
