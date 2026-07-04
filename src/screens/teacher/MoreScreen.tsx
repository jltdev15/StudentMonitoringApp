import React from 'react';
import {StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import {ActionRow} from '../../components/ActionRow';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {TeacherStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<TeacherStackParamList, 'MoreHome'>;

export const MoreScreen = ({navigation}: Props) => (
  <Screen>
    <AppHeader
      title="More"
      subtitle="Students, reports, announcements, account, and help."
      showBack={false}
    />
    <Section title="Students">
      <ActionRow
        icon="account-group-outline"
        label="Student List"
        onPress={() => navigation.navigate('StudentList')}
      />
      <ActionRow
        icon="account-plus-outline"
        label="Add Student"
        onPress={() => navigation.navigate('AddStudent')}
      />
      <ActionRow
        icon="file-upload-outline"
        label="Import Student Roster"
        onPress={() => navigation.navigate('ImportStudentRoster')}
      />
      <ActionRow
        icon="account-details-outline"
        label="Student Profile"
        onPress={() => navigation.navigate('StudentList')}
      />
      <ActionRow
        icon="archive-outline"
        label="Archived Students"
        onPress={() => navigation.navigate('ArchivedStudents')}
      />
    </Section>
    <Section title="Reports">
      <ActionRow
        icon="chart-box-outline"
        label="Reports"
        onPress={() => navigation.navigate('Reports')}
      />
    </Section>
    <Section title="Announcements">
      <ActionRow
        icon="bullhorn-outline"
        label="Post Announcement"
        onPress={() => navigation.navigate('Announcements')}
      />
      <ActionRow
        icon="history"
        label="Announcement History"
        onPress={() => navigation.navigate('Announcements')}
      />
    </Section>
    <Section title="Account">
      <ActionRow
        icon="account-circle-outline"
        label="My Profile and Settings"
        onPress={() => navigation.navigate('Settings')}
      />
    </Section>
    <Section title="Help">
      <ActionRow
        icon="information-outline"
        label="About App"
        onPress={() => navigation.navigate('AboutApp')}
      />
      <ActionRow
        icon="lifebuoy"
        label="Help / Support"
        onPress={() => navigation.navigate('HelpSupport')}
      />
    </Section>
  </Screen>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 10,
  },
});
