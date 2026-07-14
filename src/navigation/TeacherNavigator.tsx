import React from 'react';
import {StyleSheet, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {TeacherStackParamList, TeacherTabParamList} from '../types/navigation';
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
import {EditActivityScreen} from '../screens/teacher/EditActivityScreen';
import {ActivityDetailsScreen} from '../screens/teacher/ActivityDetailsScreen';
import {ScoreEncodingScreen} from '../screens/teacher/ScoreEncodingScreen';
import {ActivityHistoryScreen} from '../screens/teacher/ActivityHistoryScreen';
import {ReportsScreen} from '../screens/teacher/ReportsScreen';
import {AnnouncementsScreen} from '../screens/teacher/AnnouncementsScreen';
import {AnnouncementHistoryScreen} from '../screens/teacher/AnnouncementHistoryScreen';
import {EditAnnouncementScreen} from '../screens/teacher/EditAnnouncementScreen';
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
    <Stack.Screen name="EditActivity" component={EditActivityScreen} />
    <Stack.Screen name="ActivityDetails" component={ActivityDetailsScreen} />
    <Stack.Screen name="ScoreEncoding" component={ScoreEncodingScreen} />
    <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
    <Stack.Screen name="Reports" component={ReportsScreen} />
    <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
    <Stack.Screen
      name="AnnouncementHistory"
      component={AnnouncementHistoryScreen}
    />
    <Stack.Screen name="EditAnnouncement" component={EditAnnouncementScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="AboutApp" component={AboutAppScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
  </Stack.Navigator>
);

const DashboardStack = () => <TeacherStack initialRouteName="TeacherHome" />;
const StudentsStack = () => <TeacherStack initialRouteName="StudentList" />;
const ClassesStack = () => <TeacherStack initialRouteName="ClassList" />;
const ReportsStack = () => <TeacherStack initialRouteName="Reports" />;
const MoreStack = () => <TeacherStack initialRouteName="MoreHome" />;

type TabIconProps = {
  color: string;
  focused: boolean;
  size: number;
};

const TeacherTabIcon = ({
  color,
  focused,
  icon,
  size,
}: TabIconProps & {icon: string}) => (
  <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
    <MaterialCommunityIcons
      name={icon}
      size={focused ? 25 : Math.min(size, 24)}
      color={color}
    />
  </View>
);

const DashboardTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="home" />
);

const StudentsTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="account-group" />
);

const ClassesTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="book-open-variant" />
);

const ReportsTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="chart-box" />
);

const MoreTabIcon = (props: TabIconProps) => (
  <TeacherTabIcon {...props} icon="menu" />
);

const tabLabelStyle = {
  fontSize: 12,
  fontWeight: '700' as const,
  marginTop: -3,
};

const tabBarStyle = {
  backgroundColor: '#FFFFFF',
  borderTopColor: '#F1F4F9',
  height: 76,
  paddingBottom: 6,
  paddingTop: 8,
};

export const TeacherNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: '#7181A0',
      tabBarIconStyle: {marginTop: 0},
      tabBarLabelStyle: tabLabelStyle,
      tabBarStyle,
    }}>
    <Tab.Screen
      name="DashboardTab"
      component={DashboardStack}
      options={{title: 'Home', tabBarIcon: DashboardTabIcon}}
    />
    <Tab.Screen
      name="StudentsTab"
      component={StudentsStack}
      options={{title: 'Students', tabBarIcon: StudentsTabIcon}}
    />
    <Tab.Screen
      name="ClassesTab"
      component={ClassesStack}
      options={{title: 'Classes', tabBarIcon: ClassesTabIcon}}
    />
    <Tab.Screen
      name="ReportsTab"
      component={ReportsStack}
      options={{title: 'Reports', tabBarIcon: ReportsTabIcon}}
    />
    <Tab.Screen
      name="MoreTab"
      component={MoreStack}
      options={{title: 'More', tabBarIcon: MoreTabIcon}}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 52,
  },
  tabIconActive: {
    backgroundColor: '#E8F0FF',
  },
});
