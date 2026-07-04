import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  TeacherStackParamList,
  TeacherTabParamList,
} from '../types/navigation';
import {TeacherDashboardScreen} from '../screens/teacher/TeacherDashboardScreen';
import {ClassListScreen} from '../screens/teacher/ClassListScreen';
import {AddClassScreen} from '../screens/teacher/AddClassScreen';
import {EditClassScreen} from '../screens/teacher/EditClassScreen';
import {ClassDetailsScreen} from '../screens/teacher/ClassDetailsScreen';
import {StudentListScreen} from '../screens/teacher/StudentListScreen';
import {AddStudentScreen} from '../screens/teacher/AddStudentScreen';
import {ImportStudentRosterScreen} from '../screens/teacher/ImportStudentRosterScreen';
import {TeacherStudentProfileScreen} from '../screens/teacher/TeacherStudentProfileScreen';
import {ArchivedStudentsScreen} from '../screens/teacher/ArchivedStudentsScreen';
import {AttendanceHomeScreen} from '../screens/teacher/AttendanceHomeScreen';
import {AttendanceScreen} from '../screens/teacher/AttendanceScreen';
import {AttendanceHistoryScreen} from '../screens/teacher/AttendanceHistoryScreen';
import {DailyAttendanceScreen} from '../screens/teacher/DailyAttendanceScreen';
import {AttendanceStatusListScreen} from '../screens/teacher/AttendanceStatusListScreen';
import {ActivityHomeScreen} from '../screens/teacher/ActivityHomeScreen';
import {ActivityListScreen} from '../screens/teacher/ActivityListScreen';
import {CreateActivityScreen} from '../screens/teacher/CreateActivityScreen';
import {ActivityDetailsScreen} from '../screens/teacher/ActivityDetailsScreen';
import {ScoreEncodingScreen} from '../screens/teacher/ScoreEncodingScreen';
import {ActivityHistoryScreen} from '../screens/teacher/ActivityHistoryScreen';
import {ReportsScreen} from '../screens/teacher/ReportsScreen';
import {AnnouncementsScreen} from '../screens/teacher/AnnouncementsScreen';
import {SettingsScreen} from '../screens/teacher/SettingsScreen';
import {MoreScreen} from '../screens/teacher/MoreScreen';
import {AboutAppScreen} from '../screens/teacher/AboutAppScreen';
import {HelpSupportScreen} from '../screens/teacher/HelpSupportScreen';
import {colors} from '../utils/constants';

const Stack = createNativeStackNavigator<TeacherStackParamList>();
const Tab = createBottomTabNavigator<TeacherTabParamList>();

type TeacherStackProps = {
  initialRouteName: keyof TeacherStackParamList;
};

const TeacherStack = ({initialRouteName}: TeacherStackProps) => (
  <Stack.Navigator
    initialRouteName={initialRouteName}
    screenOptions={{headerShown: false}}>
    <Stack.Screen name="TeacherHome" component={TeacherDashboardScreen} />
    <Stack.Screen name="AttendanceHome" component={AttendanceHomeScreen} />
    <Stack.Screen name="MoreHome" component={MoreScreen} />
    <Stack.Screen name="ClassList" component={ClassListScreen} />
    <Stack.Screen name="AddClass" component={AddClassScreen} />
    <Stack.Screen name="EditClass" component={EditClassScreen} />
    <Stack.Screen name="ClassDetails" component={ClassDetailsScreen} />
    <Stack.Screen name="StudentList" component={StudentListScreen} />
    <Stack.Screen name="AddStudent" component={AddStudentScreen} />
    <Stack.Screen
      name="ImportStudentRoster"
      component={ImportStudentRosterScreen}
    />
    <Stack.Screen
      name="TeacherStudentProfile"
      component={TeacherStudentProfileScreen}
    />
    <Stack.Screen name="ArchivedStudents" component={ArchivedStudentsScreen} />
    <Stack.Screen name="Attendance" component={AttendanceScreen} />
    <Stack.Screen
      name="AttendanceHistory"
      component={AttendanceHistoryScreen}
    />
    <Stack.Screen name="DailyAttendance" component={DailyAttendanceScreen} />
    <Stack.Screen
      name="AttendanceStatusList"
      component={AttendanceStatusListScreen}
    />
    <Stack.Screen name="ActivityHome" component={ActivityHomeScreen} />
    <Stack.Screen name="ActivityList" component={ActivityListScreen} />
    <Stack.Screen name="CreateActivity" component={CreateActivityScreen} />
    <Stack.Screen name="ActivityDetails" component={ActivityDetailsScreen} />
    <Stack.Screen name="ScoreEncoding" component={ScoreEncodingScreen} />
    <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
    <Stack.Screen name="Reports" component={ReportsScreen} />
    <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="AboutApp" component={AboutAppScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
  </Stack.Navigator>
);

const DashboardStack = () => <TeacherStack initialRouteName="TeacherHome" />;
const AttendanceStack = () => <TeacherStack initialRouteName="AttendanceHome" />;
const ClassesStack = () => <TeacherStack initialRouteName="ClassList" />;
const ActivitiesStack = () => <TeacherStack initialRouteName="ActivityHome" />;
const MoreStack = () => <TeacherStack initialRouteName="MoreHome" />;

type TabIconProps = {
  color: string;
  size: number;
};

const TeacherTabIcon = ({
  color,
  icon,
  size,
}: TabIconProps & {icon: string}) => (
  <MaterialCommunityIcons name={icon} size={size} color={color} />
);

const DashboardTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="home" />
);

const AttendanceTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="calendar-check-outline" />
);

const ClassesTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="school-outline" />
);

const ActivitiesTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="clipboard-list-outline" />
);

const MoreTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="dots-horizontal" />
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

export const TeacherNavigator = () => (
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
      name="ClassesTab"
      component={ClassesStack}
      options={{title: 'Classes', tabBarIcon: ClassesTabIcon}}
    />
    <Tab.Screen
      name="ActivitiesTab"
      component={ActivitiesStack}
      options={{title: 'Activities', tabBarIcon: ActivitiesTabIcon}}
    />
    <Tab.Screen
      name="MoreTab"
      component={MoreStack}
      options={{title: 'More', tabBarIcon: MoreTabIcon}}
    />
  </Tab.Navigator>
);
