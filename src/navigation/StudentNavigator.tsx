import React from 'react';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {getFocusedRouteNameFromRoute} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {StudentStackParamList, StudentTabParamList} from '../types/navigation';
import {StudentDashboardScreen} from '../screens/student/StudentDashboardScreen';
import {MyAttendanceScreen} from '../screens/student/MyAttendanceScreen';
import {MyActivitiesScreen} from '../screens/student/MyActivitiesScreen';
import {MyScoresScreen} from '../screens/student/MyScoresScreen';
import {StudentAnnouncementsScreen} from '../screens/student/StudentAnnouncementsScreen';
import {StudentAnnouncementDetailsScreen} from '../screens/student/StudentAnnouncementDetailsScreen';
import {StudentProfileScreen} from '../screens/student/StudentProfileScreen';
import {SubmitActivityScreen} from '../screens/student/SubmitActivityScreen';

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
    <Stack.Screen
      name="StudentAnnouncementDetails"
      component={StudentAnnouncementDetailsScreen}
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

const tabConfig: Record<
  keyof StudentTabParamList,
  {icon: string; label: string}
> = {
  DashboardTab: {icon: 'home-outline', label: 'Dashboard'},
  AttendanceTab: {icon: 'calendar-check-outline', label: 'Attendance'},
  ActivitiesTab: {icon: 'clipboard-list-outline', label: 'Activities'},
  AnnouncementsTab: {icon: 'bullhorn-outline', label: 'News'},
  ProfileTab: {icon: 'account-circle-outline', label: 'Profile'},
};

export const StudentTabBar = ({
  descriptors,
  navigation,
  state,
}: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const compact = width < 370;
  const focusedTab = state.routes[state.index];
  const focusedScreen = getFocusedRouteNameFromRoute(focusedTab);

  if (focusedScreen === 'StudentAnnouncementDetails') {
    return null;
  }

  return (
    <View
      style={[
        styles.tabBarShell,
        {paddingBottom: Math.max(insets.bottom, 10)},
      ]}>
      <View style={[styles.tabBar, compact && styles.tabBarCompact]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = tabConfig[route.name as keyof StudentTabParamList];
          const {options} = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title || config.label;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              accessibilityLabel={`${label} tab`}
              accessibilityRole="tab"
              accessibilityState={{selected: focused}}
              key={route.key}
              onLongPress={() =>
                navigation.emit({type: 'tabLongPress', target: route.key})
              }
              onPress={onPress}
              style={({pressed}) => [
                styles.tabItem,
                pressed && styles.tabItemPressed,
              ]}>
              <View
                style={[
                  styles.tabIcon,
                  compact && styles.tabIconCompact,
                  focused && styles.tabIconActive,
                ]}>
                <MaterialCommunityIcons
                  name={config.icon}
                  size={compact ? 22 : 25}
                  color={focused ? '#FFFFFF' : '#7786A2'}
                />
              </View>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  compact && styles.tabLabelCompact,
                  focused && styles.tabLabelActive,
                ]}>
                {label}
              </Text>
              {focused ? <View style={styles.activeIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const renderStudentTabBar = (props: BottomTabBarProps) => (
  <StudentTabBar {...props} />
);

export const StudentNavigator = () => (
  <Tab.Navigator
    sceneContainerStyle={styles.transparentScene}
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
    }}
    tabBar={renderStudentTabBar}>
    <Tab.Screen
      name="DashboardTab"
      component={DashboardStack}
      options={{title: 'Dashboard'}}
    />
    <Tab.Screen
      name="AttendanceTab"
      component={AttendanceStack}
      options={{title: 'Attendance'}}
    />
    <Tab.Screen
      name="ActivitiesTab"
      component={ActivitiesStack}
      options={{title: 'Activities'}}
    />
    <Tab.Screen
      name="AnnouncementsTab"
      component={AnnouncementsStack}
      options={{title: 'News'}}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileStack}
      options={{title: 'Profile'}}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  transparentScene: {backgroundColor: 'transparent'},
  tabBarShell: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 36,
    borderWidth: 1,
    elevation: 12,
    flexDirection: 'row',
    minHeight: 82,
    paddingHorizontal: 4,
    shadowColor: '#6F83A8',
    shadowOffset: {height: 9, width: 0},
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  tabBarCompact: {borderRadius: 30, minHeight: 76},
  tabItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingBottom: 9,
    paddingTop: 7,
  },
  tabItemPressed: {opacity: 0.72},
  tabIcon: {
    alignItems: 'center',
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 46,
  },
  tabIconCompact: {borderRadius: 999, height: 40, width: 40},
  tabIconActive: {
    backgroundColor: '#3479F6',
    elevation: 5,
    shadowColor: '#3479F6',
    shadowOffset: {height: 6, width: 0},
    shadowOpacity: 0.34,
    shadowRadius: 10,
  },
  tabLabel: {
    color: '#7786A2',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: '100%',
  },
  tabLabelCompact: {fontSize: 9},
  tabLabelActive: {color: '#286BE8', fontWeight: '900'},
  activeIndicator: {
    backgroundColor: '#3D7EFA',
    borderRadius: 4,
    bottom: 2,
    height: 4,
    position: 'absolute',
    width: 28,
  },
});
