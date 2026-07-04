import React from 'react';
import {StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';

export const AboutAppScreen = () => (
  <Screen>
    <AppHeader
      title="About App"
      subtitle="Class monitoring tools for teachers and students."
    />
    <AppCard>
      <Text style={styles.title}>Student Monitoring App</Text>
      <Text style={styles.body}>
        Manage classes, attendance, activities, scores, announcements, and
        reports from one classroom-focused workspace.
      </Text>
    </AppCard>
  </Screen>
);

const styles = StyleSheet.create({
  body: {
    color: '#3B4968',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 8,
  },
  title: {
    color: '#081638',
    fontSize: 20,
    fontWeight: '900',
  },
});
