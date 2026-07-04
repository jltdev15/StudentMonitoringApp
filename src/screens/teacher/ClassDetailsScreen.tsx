import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import {ActionRow} from '../../components/ActionRow';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {archiveClass} from '../../services/classService';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<TeacherStackParamList, 'ClassDetails'>;

export const ClassDetailsScreen = ({route, navigation}: Props) => {
  const {classItem} = route.params;
  return (
    <Screen>
      <AppHeader
        title={classItem.className}
        subtitle={`${classItem.subject} · ${classItem.gradeLevel} - ${classItem.section}`}
      />
      <AppCard>
        <Text>Schedule: {classItem.schedule || 'Not set'}</Text>
        <Text>Status: {classItem.status}</Text>
      </AppCard>
      <ActionRow
        icon="account-group"
        label="Students"
        primary
        onPress={() =>
          navigation.navigate('StudentList', {classId: classItem.id})
        }
      />
      <ActionRow
        icon="pencil-outline"
        label="Edit Class"
        onPress={() => navigation.navigate('EditClass', {classItem})}
      />
      <ActionRow
        icon="clipboard-check-outline"
        label="Take Attendance"
        onPress={() =>
          navigation.navigate('Attendance', {classId: classItem.id})
        }
      />
      <ActionRow
        icon="book-open-page-variant-outline"
        label="Activities"
        onPress={() =>
          navigation.navigate('ActivityList', {classId: classItem.id})
        }
      />
      <ActionRow
        icon="archive-outline"
        label="Archive Class"
        onPress={async () => {
          await archiveClass(classItem.id);
          navigation.goBack();
        }}
      />
    </Screen>
  );
};
