import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {CommonActions} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {LoadingState} from '../../components/LoadingState';
import {useAuth} from '../../context/AuthContext';
import {
  getActivitiesByClass,
  getSubmissionsByActivity,
} from '../../services/activityService';
import {getAttendanceByClassAndDate} from '../../services/attendanceService';
import {getTeacherClasses} from '../../services/classService';
import {countByStatus} from '../../services/reportService';
import {getStudentsByClass} from '../../services/studentService';
import {
  ActivityRecord,
  ActivitySubmissionRecord,
  ClassRecord,
} from '../../types/models';
import {
  TeacherStackParamList,
  TeacherTabParamList,
} from '../../types/navigation';
import {colors} from '../../utils/constants';
import {toDateString, toReadableDate} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'TeacherHome'>;
type ActionRoute = 'Attendance' | 'CreateActivity' | 'AddStudent' | 'Reports';
type TeacherTabRoute = keyof TeacherTabParamList;

type ClassSummary = {
  classItem: ClassRecord;
  studentCount: number;
  attendancePercent: number;
};

type ActivitySummary = {
  activity: ActivityRecord;
  className: string;
  completedSubmissions: number;
  expectedSubmissions: number;
};

const overviewCards = [
  {
    key: 'students',
    label: 'Students',
    icon: 'account-group-outline',
    color: '#13A464',
  },
  {
    key: 'present',
    label: 'Present',
    icon: 'check-circle-outline',
    color: '#16A34A',
  },
  {
    key: 'absent',
    label: 'Absent',
    icon: 'account-remove-outline',
    color: '#E31D35',
  },
  {
    key: 'late',
    label: 'Late',
    icon: 'clock-outline',
    color: '#F47C0B',
  },
] as const;

const quickActions: {
  label: string;
  icon: string;
  route: ActionRoute;
  tab: TeacherTabRoute;
}[] = [
  {
    label: 'Take Attendance',
    icon: 'calendar-check-outline',
    route: 'Attendance',
    tab: 'AttendanceTab',
  },
  {
    label: 'Create Activity',
    icon: 'file-document-plus-outline',
    route: 'CreateActivity',
    tab: 'ActivitiesTab',
  },
  {
    label: 'Add Student',
    icon: 'account-plus',
    route: 'AddStudent',
    tab: 'MoreTab',
  },
  {
    label: 'View Reports',
    icon: 'chart-box-outline',
    route: 'Reports',
    tab: 'MoreTab',
  },
];

const completedSubmissionStatuses = new Set(['submitted', 'late']);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning,';
  }
  if (hour < 18) {
    return 'Good afternoon,';
  }
  return 'Good evening,';
};

const formatClassTitle = (classItem: ClassRecord) => {
  if (classItem.gradeLevel && classItem.subject) {
    return `${classItem.gradeLevel} - ${classItem.subject}`;
  }
  return classItem.className;
};

const getClassIcon = (index: number) =>
  index % 2 === 0 ? 'xml' : 'book-open-variant';

export const TeacherDashboardScreen = ({navigation}: Props) => {
  const {profile} = useAuth();
  const {width} = useWindowDimensions();
  const isCompact = width < 420;
  const isDashboardCompact = width < 560;
  const isHeroCompact = width < 560;
  const isHeroVeryCompact = width < 390;
  const isVeryCompact = width < 360;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    students: 0,
    present: 0,
    absent: 0,
    late: 0,
  });
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivitySummary[]>(
    [],
  );
  const [error, setError] = useState('');

  const today = useMemo(() => new Date(), []);
  const readableDate = today.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const weekday = today.toLocaleDateString(undefined, {weekday: 'long'});
  const scrollContentStyle = useMemo(
    () => [styles.screen, {paddingBottom: 34}],
    [],
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!profile) {
        return;
      }
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const classes = await getTeacherClasses(profile.uid);
        const studentsByClass = await Promise.all(
          classes.map(item => getStudentsByClass(item.id)),
        );
        const todayKey = toDateString();
        const attendanceByClass = await Promise.all(
          classes.map(item => getAttendanceByClassAndDate(item.id, todayKey)),
        );
        const allAttendance = attendanceByClass.flat();
        const attendanceSummary = countByStatus(allAttendance);
        const uniqueStudents = new Set(
          studentsByClass.flat().map(student => student.id),
        );

        const nextClassSummaries = classes.map((classItem, index) => {
          const studentCount = studentsByClass[index]?.length || 0;
          const presentCount =
            attendanceByClass[index]?.filter(item => item.status === 'present')
              .length || 0;
          return {
            classItem: {...classItem, studentCount},
            studentCount,
            attendancePercent: studentCount
              ? Math.round((presentCount / studentCount) * 100)
              : 0,
          };
        });

        const activityGroups = await Promise.all(
          classes.map(async (classItem, index) => {
            const activities = await getActivitiesByClass(classItem.id);
            return activities.map(activity => ({
              activity,
              className: formatClassTitle(classItem),
              expectedSubmissions: studentsByClass[index]?.length || 0,
            }));
          }),
        );
        const activityRows = activityGroups.flat();
        const submissionsByActivity = await Promise.all(
          activityRows.map(item => getSubmissionsByActivity(item.activity.id)),
        );
        const nextActivities = activityRows
          .map((item, index) => {
            const completedSubmissions = submissionsByActivity[index].filter(
              (submission: ActivitySubmissionRecord) =>
                completedSubmissionStatuses.has(submission.status),
            ).length;
            return {
              ...item,
              completedSubmissions,
            };
          })
          .sort((first, second) => {
            const firstDate =
              first.activity.dueDate && 'toDate' in first.activity.dueDate
                ? first.activity.dueDate.toDate()
                : first.activity.dueDate;
            const secondDate =
              second.activity.dueDate && 'toDate' in second.activity.dueDate
                ? second.activity.dueDate.toDate()
                : second.activity.dueDate;
            return Number(secondDate || 0) - Number(firstDate || 0);
          });

        setStats({
          students: uniqueStudents.size,
          present: attendanceSummary.present || 0,
          absent: attendanceSummary.absent || 0,
          late: attendanceSummary.late || 0,
        });
        setClassSummaries(nextClassSummaries);
        setRecentActivities(nextActivities);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load dashboard data.',
        );
      } finally {
        if (mode === 'refresh') {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [profile],
  );

  const refresh = useCallback(() => {
    load('refresh');
  }, [load]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => load());
    return unsubscribe;
  }, [load, navigation]);

  const navigateToTabScreen = useCallback(
    (
      tab: TeacherTabRoute,
      screen: keyof TeacherStackParamList,
      params?: object,
    ) => {
      navigation.getParent()?.dispatch(
        CommonActions.navigate({
          name: tab,
          params: {
            screen,
            params,
          },
        }),
      );
    },
    [navigation],
  );

  if (loading) {
    return <LoadingState label="Loading dashboard..." />;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        style={styles.scroll}
        contentContainerStyle={scrollContentStyle}>
        
        {/* HERO SECTION */}
        <View style={[styles.hero, isHeroCompact && styles.heroCompact]}>
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />
          <View
            style={[
              styles.heroContent,
              isHeroCompact && styles.heroContentCompact,
              isHeroVeryCompact && styles.heroContentVeryCompact,
            ]}>
            <View style={styles.greetingWrap}>
              <Text
                style={[
                  styles.greeting,
                  isHeroCompact && styles.greetingCompact,
                ]}>
                {getGreeting()}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.teacherName,
                  isDashboardCompact && styles.teacherNameCompact,
                ]}>
                {profile?.fullName || 'Teacher'}
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  isDashboardCompact && styles.heroSubtitleCompact,
                ]}>
                Here's what's happening in your classes today.
              </Text>
            </View>
            <View
              style={[
                styles.heroSide,
                isHeroCompact && styles.heroSideCompact,
                isHeroVeryCompact && styles.heroSideVeryCompact,
              ]}>
              <View
                style={[
                  styles.dateBadge,
                  isDashboardCompact && styles.dateBadgeCompact,
                  isHeroVeryCompact && styles.dateBadgeStacked,
                ]}>
                <View
                  style={[
                    styles.calendarIconWrap,
                    isDashboardCompact && styles.calendarIconWrapCompact,
                  ]}>
                  <MaterialCommunityIcons
                    name="calendar-month"
                    size={isDashboardCompact ? 20 : 24}
                    color="#062A66"
                  />
                </View>
                <View style={styles.dateCopy}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.dateText,
                      isDashboardCompact && styles.dateTextCompact,
                    ]}>
                    {readableDate}
                  </Text>
                  <Text
                    style={[
                      styles.weekdayText,
                      isDashboardCompact && styles.weekdayTextCompact,
                    ]}>
                    {weekday}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* OVERVIEW STATS */}
          <Text
            style={[
              styles.sectionTitle,
              isDashboardCompact && styles.sectionTitleCompactScreen,
            ]}>
            Today's Overview
          </Text>
          
          <View style={[styles.overviewGrid, isVeryCompact && styles.overviewGridCompact]}>
            {overviewCards.map((card) => {
              // Add alpha to the color for the background tint
              const tintColor = card.color + '15'; // ~8% opacity hex
              return (
                <View
                  key={card.key}
                  style={[
                    styles.overviewCard,
                    isDashboardCompact && styles.overviewCardCompact,
                    isVeryCompact && styles.overviewCardVeryCompact,
                  ]}>
                  <View style={[styles.overviewIconWrap, { backgroundColor: tintColor }]}>
                    <MaterialCommunityIcons
                      name={card.icon}
                      size={isDashboardCompact ? 28 : 34}
                      color={card.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.overviewValue,
                      isDashboardCompact && styles.overviewValueCompact,
                    ]}>
                    {stats[card.key]}
                  </Text>
                  <Text
                    style={[
                      styles.overviewLabel,
                      isDashboardCompact && styles.overviewLabelCompact,
                    ]}>
                    {card.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* QUICK ACTIONS */}
          <Text
            style={[
              styles.sectionTitle,
              isDashboardCompact && styles.sectionTitleCompactScreen,
            ]}>
            Quick Actions
          </Text>
          <View
            style={[
              styles.quickActionGrid,
              isVeryCompact && styles.quickActionGridCompact,
            ]}>
            {quickActions.map(action => (
              <Pressable
                accessibilityRole="button"
                key={action.route}
                onPress={() => navigateToTabScreen(action.tab, action.route)}
                style={({pressed}) => [
                  styles.quickActionCard,
                  isDashboardCompact && styles.quickActionCardCompact,
                  isVeryCompact && styles.quickActionCardVeryCompact,
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.quickActionIconWrap, isDashboardCompact && styles.quickActionIconWrapCompact]}>
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={isDashboardCompact ? 24 : 28}
                    color="#FFFFFF"
                  />
                </View>
                <Text
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  style={[
                    styles.quickActionText,
                    isDashboardCompact && styles.quickActionTextCompact,
                  ]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* MY CLASSES */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleCompact}>My Classes</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigateToTabScreen('ClassesTab', 'ClassList')}
              style={({pressed}) => pressed && styles.pressed}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>
          
          <View style={styles.listContainer}>
            {classSummaries.slice(0, 2).length ? (
              classSummaries.slice(0, 2).map((item, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.classItem.id}
                  onPress={() =>
                    navigateToTabScreen('ClassesTab', 'ClassDetails', {
                      classItem: item.classItem,
                    })
                  }
                  style={({pressed}) => [
                    styles.listItemCard,
                    isCompact && styles.listItemCardCompact,
                    pressed && styles.pressed,
                  ]}>
                  <View
                    style={[
                      styles.classIcon,
                      isCompact && styles.classIconCompact,
                    ]}>
                    <MaterialCommunityIcons
                      name={getClassIcon(index)}
                      size={isCompact ? 28 : 34}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.rowMain}>
                    <Text numberOfLines={1} style={styles.classTitle}>
                      {formatClassTitle(item.classItem)}
                    </Text>
                    <Text numberOfLines={1} style={styles.classSubject}>
                      {item.classItem.subject}
                    </Text>
                    <View style={styles.studentCountBadge}>
                      <MaterialCommunityIcons name="account-group" size={14} color="#52617E" />
                      <Text style={styles.classStudentCount}>
                        {item.studentCount} Students
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.attendanceWrap,
                      isCompact && styles.attendanceWrapCompact,
                    ]}>
                    <Text style={styles.attendancePercent}>
                      {item.attendancePercent}%
                    </Text>
                    <Text style={styles.attendanceLabel}>Attendance</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <MaterialCommunityIcons name="google-classroom" size={42} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No classes yet</Text>
                <Text style={styles.emptyMessage}>
                  Create a class to start tracking attendance and activities.
                </Text>
              </View>
            )}
          </View>

          {/* RECENT ACTIVITIES */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleCompact}>Recent Activities</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigateToTabScreen('ActivitiesTab', 'ActivityList')
              }
              style={({pressed}) => pressed && styles.pressed}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>
          
          <View style={styles.listContainer}>
            {recentActivities.slice(0, 2).length ? (
              recentActivities.slice(0, 2).map((item, index) => {
                const isSubmitted =
                  item.expectedSubmissions > 0 &&
                  item.completedSubmissions >= item.expectedSubmissions;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={item.activity.id}
                    onPress={() =>
                      navigateToTabScreen('ActivitiesTab', 'ActivityDetails', {
                        activity: item.activity,
                      })
                    }
                    style={({pressed}) => [
                      styles.listItemCard,
                      isCompact && styles.listItemCardCompact,
                      pressed && styles.pressed,
                    ]}>
                    <View
                      style={[
                        styles.activityIconWrap,
                        isCompact && styles.activityIconWrapCompact,
                      ]}>
                        <MaterialCommunityIcons
                          name="file-document-edit-outline"
                          size={isCompact ? 26 : 30}
                          color={colors.primary}
                        />
                    </View>
                    <View style={styles.activityMain}>
                      <Text numberOfLines={1} style={styles.activityTitle}>
                        {item.activity.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.activityClassName}>
                        {item.className}
                      </Text>
                      <View style={styles.dueRow}>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={15}
                          color="#64748B"
                        />
                        <Text style={styles.dueText}>
                          Due: {toReadableDate(item.activity.dueDate)}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.activityMeta,
                        isCompact && styles.activityMetaCompact,
                      ]}>
                      <View
                        style={[
                          styles.statusPill,
                          isSubmitted
                            ? styles.submittedPill
                            : styles.pendingPill,
                        ]}>
                        <Text
                          style={[
                            styles.statusText,
                            isSubmitted
                              ? styles.submittedText
                              : styles.pendingText,
                          ]}>
                          {isSubmitted ? 'Submitted' : 'Pending'}
                        </Text>
                      </View>
                      <Text style={styles.submissionCount}>
                        {item.completedSubmissions} / {item.expectedSubmissions}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={42} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No activities yet</Text>
                <Text style={styles.emptyMessage}>
                  Create an activity once your first class is ready.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#F4F7FB',
    flex: 1,
  },
  scroll: {
    backgroundColor: '#F4F7FB',
    flex: 1,
  },
  screen: {
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  hero: {
    backgroundColor: '#0A2D69',
    marginHorizontal: 0,
    marginTop: 0,
    minHeight: 250,
    overflow: 'hidden',
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 40,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    elevation: 8,
    shadowColor: '#0A2D69',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    zIndex: 10,
  },
  heroCompact: {
    minHeight: 230,
    paddingBottom: 54,
    paddingHorizontal: 24,
    paddingTop: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroGlowTop: {
    backgroundColor: '#1E5DE3',
    borderRadius: 200,
    height: 400,
    opacity: 0.25,
    position: 'absolute',
    left: -150,
    top: -150,
    width: 400,
  },
  heroGlowBottom: {
    backgroundColor: '#357AE8',
    borderRadius: 150,
    height: 300,
    opacity: 0.2,
    position: 'absolute',
    right: -100,
    bottom: -100,
    width: 300,
  },
  heroContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 22,
    justifyContent: 'space-between',
  },
  heroContentCompact: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  heroContentVeryCompact: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 20,
  },
  greetingWrap: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    color: '#93B8FA',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  greetingCompact: {
    fontSize: 18,
  },
  teacherName: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  teacherNameCompact: {
    fontSize: 32,
  },
  heroSubtitle: {
    color: '#E0EBFF',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    marginTop: 8,
  },
  heroSubtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  heroSide: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'flex-end',
  },
  heroSideCompact: {
    alignItems: 'center',
    alignSelf: 'auto',
    justifyContent: 'flex-end',
  },
  heroSideVeryCompact: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
  },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    flexDirection: 'row',
    padding: 8,
    paddingRight: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dateBadgeCompact: {
    borderRadius: 16,
    padding: 6,
    paddingRight: 14,
    gap: 10,
  },
  dateBadgeStacked: {
    alignSelf: 'flex-start',
  },
  calendarIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
    shadowColor: '#000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  calendarIconWrapCompact: {
    borderRadius: 12,
    height: 38,
    width: 38,
  },
  dateCopy: {
    justifyContent: 'center',
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  dateTextCompact: {
    fontSize: 14,
  },
  weekdayText: {
    color: '#A8C7FA',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  weekdayTextCompact: {
    fontSize: 12,
  },
  body: {
    paddingBottom: 26,
    paddingHorizontal: 24,
    zIndex: 1,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    marginTop: 18,
    padding: 16,
  },
  errorText: {
    color: '#EF4444',
    fontWeight: '800',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginTop: 4,
    zIndex: 2,
  },
  overviewGridCompact: {
    gap: 12,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '48%',
    padding: 20,
    elevation: 6,
    shadowColor: '#8C9AB5',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  overviewCardCompact: {
    borderRadius: 18,
    padding: 16,
  },
  overviewCardVeryCompact: {
    width: '100%',
  },
  overviewIconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
    marginBottom: 14,
  },
  overviewValue: {
    color: '#0A1B3F',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  overviewValueCompact: {
    fontSize: 28,
  },
  overviewLabel: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  overviewLabelCompact: {
    fontSize: 13,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 36,
  },
  sectionTitle: {
    color: '#0A1B3F',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 18,
    marginTop: 32,
  },
  sectionTitleCompactScreen: {
    fontSize: 19,
    marginBottom: 14,
    marginTop: 28,
  },
  sectionTitleCompact: {
    color: '#0A1B3F',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  viewAll: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  quickActionGridCompact: {
    gap: 12,
  },
  quickActionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '48%',
    paddingVertical: 24,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: '#8C9AB5',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  quickActionCardCompact: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  quickActionCardVeryCompact: {
    width: '100%',
  },
  quickActionIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 56,
    justifyContent: 'center',
    width: 56,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  quickActionIconWrapCompact: {
    borderRadius: 18,
    height: 48,
    width: 48,
    marginBottom: 12,
  },
  quickActionText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  quickActionTextCompact: {
    fontSize: 14,
  },
  listContainer: {
    gap: 14,
  },
  listItemCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    elevation: 4,
    shadowColor: '#8C9AB5',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  listItemCardCompact: {
    borderRadius: 16,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  classIcon: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    height: 64,
    justifyContent: 'center',
    width: 64,
    shadowColor: '#000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  classIconCompact: {
    borderRadius: 14,
    height: 54,
    width: 54,
  },
  rowMain: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    justifyContent: 'center',
  },
  classTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  classSubject: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  studentCountBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  classStudentCount: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  attendanceWrap: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  attendanceWrapCompact: {
    minWidth: 60,
  },
  attendancePercent: {
    color: '#10B981',
    fontSize: 24,
    fontWeight: '900',
  },
  attendanceLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  activityIconWrap: {
    alignItems: 'center',
    backgroundColor: '#F0F5FF',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  activityIconWrapCompact: {
    borderRadius: 14,
    height: 52,
    width: 52,
  },
  activityMain: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    justifyContent: 'center',
  },
  activityTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  activityClassName: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  dueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  dueText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: 10,
    justifyContent: 'center',
    minWidth: 82,
  },
  activityMetaCompact: {
    minWidth: 70,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  submittedPill: {
    backgroundColor: '#ECFDF5',
  },
  submittedText: {
    color: '#059669',
  },
  pendingPill: {
    backgroundColor: '#FFF7ED',
  },
  pendingText: {
    color: '#EA580C',
  },
  submissionCount: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    borderStyle: 'dashed',
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: 16,
    width: 80,
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyMessage: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 240,
  },
});
