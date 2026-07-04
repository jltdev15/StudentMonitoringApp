import React from 'react';
import {StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';

export const HelpSupportScreen = () => (
  <Screen>
    <AppHeader
      title="Help / Support"
      subtitle="Find support information and basic guidance."
    />
    <AppCard>
      <Text style={styles.title}>Need help?</Text>
      <Text style={styles.body}>
        Contact your school administrator for account access, class setup, or
        data correction requests.
      </Text>
    </AppCard>
    <AppCard>
      <Text style={styles.title}>Common workflow</Text>
      <Text style={styles.body}>
        Create classes, add students, record attendance, publish activities,
        encode scores, and review reports.
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
