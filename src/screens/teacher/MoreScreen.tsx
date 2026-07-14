import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import {ActionRow} from '../../components/ActionRow';
import {AppHeader} from '../../components/AppHeader';
import {TeacherStackParamList} from '../../types/navigation';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<TeacherStackParamList, 'MoreHome'>;

export const MoreScreen = ({navigation}: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View
        testID="more-sticky-header"
        style={[styles.stickyHeader, {paddingTop: insets.top + 20}]}>
        <AppHeader
          variant="teacher"
          title="More"
          subtitle="Students, reports, announcements, account, and help."
          showBack={false}
        />
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}>
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
            onPress={() => navigation.navigate('AnnouncementHistory')}
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
      </ScrollView>
    </View>
  );
};

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
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  root: {
    backgroundColor: '#F6F9FE',
    flex: 1,
  },
  scroll: {
    backgroundColor: '#F6F9FE',
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#112B5D',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 10,
    marginTop: 6,
  },
  stickyHeader: {
    backgroundColor: '#F6F9FE',
    paddingHorizontal: 20,
    zIndex: 2,
  },
});
