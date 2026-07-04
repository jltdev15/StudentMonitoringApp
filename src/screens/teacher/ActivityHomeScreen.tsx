import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ActionRow} from '../../components/ActionRow';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<TeacherStackParamList, 'ActivityHome'>;

export const ActivityHomeScreen = ({navigation}: Props) => (
  <Screen>
    <AppHeader
      title="Activities"
      subtitle="Create, review, check submissions, and encode scores."
      showBack={false}
    />
    <ActionRow
      icon="clipboard-list-outline"
      label="Activity List"
      primary
      onPress={() => navigation.navigate('ActivityList')}
    />
    <ActionRow
      icon="file-document-plus-outline"
      label="Create Activity"
      onPress={() => navigation.navigate('CreateActivity')}
    />
    <ActionRow
      icon="playlist-edit"
      label="Check Submissions / Encode Scores"
      onPress={() => navigation.navigate('ActivityList')}
    />
    <ActionRow
      icon="history"
      label="Activity History"
      onPress={() => navigation.navigate('ActivityHistory')}
    />
  </Screen>
);
