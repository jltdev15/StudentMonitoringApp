import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {StudentStackParamList, StudentTabParamList} from '../types/navigation';
import {StudentDashboardScreen} from '../screens/student/StudentDashboardScreen';
import {MyAttendanceScreen} from '../screens/student/MyAttendanceScreen';
import {MyActivitiesScreen} from '../screens/student/MyActivitiesScreen';
import {MyScoresScreen} from '../screens/student/MyScoresScreen';
import {StudentAnnouncementsScreen} from '../screens/student/StudentAnnouncementsScreen';
import {StudentProfileScreen} from '../screens/student/StudentProfileScreen';
import {SubmitActivityScreen} from '../screens/student/SubmitActivityScreen';
import {colors} from '../utils/constants';

const Stack = createNativeStackNavigator<StudentStackParamList>();
const Tab = createBottomTabNavigator<StudentTabParamList>();

type StudentStackProps = {
  initialRouteName: keyof StudentStackParamList;
};

const StudentStack = ({initialRouteName}: StudentStackProps) => (
  <Stack.Navigator
    initialRouteName={initialRouteName}
    screenOptions={{headerShown: false}}>
    <Stack.Screen name="StudentHome" component={StudentDashboardScreen} />
    <Stack.Screen name="MyAttendance" component={MyAttendanceScreen} />
    <Stack.Screen name="MyActivities" component={MyActivitiesScreen} />
    <Stack.Screen name="MyScores" component={MyScoresScreen} />
    <Stack.Screen
      name="StudentAnnouncements"
      component={StudentAnnouncementsScreen}
    />
    <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
    <Stack.Screen name="SubmitActivity" component={SubmitActivityScreen} />
  </Stack.Navigator>
);

const DashboardStack = () => <StudentStack initialRouteName="StudentHome" />;
const AttendanceStack = () => <StudentStack initialRouteName="MyAttendance" />;
const ActivitiesStack = () => <StudentStack initialRouteName="MyActivities" />;
const AnnouncementsStack = () => (
  <StudentStack initialRouteName="StudentAnnouncements" />
);
const ProfileStack = () => <StudentStack initialRouteName="StudentProfile" />;

type TabIconProps = {
  color: string;
  size: number;
};

const StudentTabIcon = ({color, icon, size}: TabIconProps & {icon: string}) => (
  <MaterialCommunityIcons name={icon} size={size} color={color} />
);

const DashboardTabIcon = (props: TabIconProps) => (
  <StudentTabIcon {...props} icon="home" />
);

const AttendanceTabIcon = (props: TabIconProps) => (
  <StudentTabIcon {...props} icon="calendar-check-outline" />
);

const ActivitiesTabIcon = (props: TabIconProps) => (
  <StudentTabIcon {...props} icon="clipboard-list-outline" />
);

const AnnouncementsTabIcon = (props: TabIconProps) => (
  <StudentTabIcon {...props} icon="bullhorn-outline" />
);

const ProfileTabIcon = (props: TabIconProps) => (
  <StudentTabIcon {...props} icon="account-circle-outline" />
);

const tabLabelStyle = {
  fontSize: 12,
  fontWeight: '800' as const,
};

const tabBarStyle = {
  backgroundColor: '#FFFFFF',
  borderTopColor: '#EEF2F7',
  minHeight: 70,
  paddingBottom: 10,
  paddingTop: 8,
};

export const StudentNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: '#5C667D',
      tabBarLabelStyle: tabLabelStyle,
      tabBarStyle,
    }}>
    <Tab.Screen
      name="DashboardTab"
      component={DashboardStack}
      options={{title: 'Dashboard', tabBarIcon: DashboardTabIcon}}
    />
    <Tab.Screen
      name="AttendanceTab"
      component={AttendanceStack}
      options={{title: 'Attendance', tabBarIcon: AttendanceTabIcon}}
    />
    <Tab.Screen
      name="ActivitiesTab"
      component={ActivitiesStack}
      options={{title: 'Activities', tabBarIcon: ActivitiesTabIcon}}
    />
    <Tab.Screen
      name="AnnouncementsTab"
      component={AnnouncementsStack}
      options={{title: 'News', tabBarIcon: AnnouncementsTabIcon}}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileStack}
      options={{title: 'Profile', tabBarIcon: ProfileTabIcon}}
    />
  </Tab.Navigator>
);
