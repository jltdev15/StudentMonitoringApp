import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {StudentStackParamList} from '../types/navigation';
import {StudentDashboardScreen} from '../screens/student/StudentDashboardScreen';
import {MyAttendanceScreen} from '../screens/student/MyAttendanceScreen';
import {MyActivitiesScreen} from '../screens/student/MyActivitiesScreen';
import {MyScoresScreen} from '../screens/student/MyScoresScreen';
import {StudentAnnouncementsScreen} from '../screens/student/StudentAnnouncementsScreen';
import {StudentProfileScreen} from '../screens/student/StudentProfileScreen';

const Stack = createNativeStackNavigator<StudentStackParamList>();

export const StudentNavigator = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="StudentHome" component={StudentDashboardScreen} />
    <Stack.Screen name="MyAttendance" component={MyAttendanceScreen} />
    <Stack.Screen name="MyActivities" component={MyActivitiesScreen} />
    <Stack.Screen name="MyScores" component={MyScoresScreen} />
    <Stack.Screen
      name="StudentAnnouncements"
      component={StudentAnnouncementsScreen}
    />
    <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
  </Stack.Navigator>
);
