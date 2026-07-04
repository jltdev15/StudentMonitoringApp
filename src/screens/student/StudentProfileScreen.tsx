import React from 'react';
import {StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';

export const StudentProfileScreen = () => {
  const {profile, student, signOut, loading} = useAuth();
  return (
    <Screen>
      <AppHeader title="Profile" subtitle="Student information and account." />
      <AppCard>
        <Text variant="titleMedium" style={styles.name}>
          {profile?.fullName || student?.fullName}
        </Text>
        <Text style={styles.meta}>{profile?.email || student?.email}</Text>
        <Text style={styles.meta}>
          Student No: {student?.studentNumber || profile?.studentId || '-'}
        </Text>
        <Text style={styles.meta}>
          Status: {student?.status || profile?.status}
        </Text>
      </AppCard>
      <AppButton mode="outlined" loading={loading} onPress={signOut}>
        Log out
      </AppButton>
    </Screen>
  );
};

const styles = StyleSheet.create({
  meta: {
    color: '#3B4968',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  name: {
    color: '#081638',
    fontSize: 20,
    fontWeight: '900',
  },
});
