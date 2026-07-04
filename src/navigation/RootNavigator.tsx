import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {View} from 'react-native';
import {Button, Text} from 'react-native-paper';
import {LoadingState} from '../components/LoadingState';
import {useAuth} from '../context/AuthContext';
import {AuthNavigator} from './AuthNavigator';
import {StudentNavigator} from './StudentNavigator';
import {TeacherNavigator} from './TeacherNavigator';

export const RootNavigator = () => {
  const {firebaseUser, profile, initializing, authError, signOut} = useAuth();

  if (initializing) {
    return <LoadingState label="Preparing your classroom..." />;
  }

  const renderNavigator = () => {
    if (!firebaseUser) {
      return <AuthNavigator />;
    }
    if (profile?.role === 'teacher') {
      return <TeacherNavigator />;
    }
    if (profile?.role === 'student') {
      return <StudentNavigator />;
    }
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
        <Text variant="titleMedium">Account setup needed</Text>
        <Text style={{marginTop: 8, marginBottom: 24, textAlign: 'center'}}>
          {authError ||
            'Your Firebase Auth account does not have a valid Firestore role yet.'}
        </Text>
        <Button mode="contained" onPress={() => signOut()}>
          Sign Out
        </Button>
      </View>
    );
  };

  return <NavigationContainer>{renderNavigator()}</NavigationContainer>;
};
