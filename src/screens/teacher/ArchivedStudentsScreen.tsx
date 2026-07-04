import React, {useCallback, useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppHeader} from '../../components/AppHeader';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {StudentListItem} from '../../components/StudentListItem';
import {useAuth} from '../../context/AuthContext';
import {getTeacherClasses} from '../../services/classService';
import {getStudentsByClassAndStatus} from '../../services/studentService';
import {StudentRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<TeacherStackParamList, 'ArchivedStudents'>;

export const ArchivedStudentsScreen = ({navigation}: Props) => {
  const {profile} = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const classes = await getTeacherClasses(profile.uid);
    const all = (
      await Promise.all(
        classes.map(item => getStudentsByClassAndStatus(item.id, 'inactive')),
      )
    ).flat();
    setStudents(Array.from(new Map(all.map(item => [item.id, item])).values()));
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingState label="Loading archived students..." />;
  }

  return (
    <Screen>
      <AppHeader
        title="Archived Students"
        subtitle="Review inactive student profiles."
      />
      {students.length ? (
        students.map(student => (
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
          title="No archived students"
          message="Inactive student profiles will appear here."
        />
      )}
    </Screen>
  );
};
