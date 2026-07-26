import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {LoadingState} from '../../components/LoadingState';
import {useAuth} from '../../context/AuthContext';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../../services/activityService';
import {getStudentAttendance} from '../../services/attendanceService';
import {
  calculateAverageScore,
  countByStatus,
} from '../../services/reportService';
import {
  ActivityRecord,
  ActivitySubmissionRecord,
} from '../../types/models';
import {StudentStackParamList} from '../../types/navigation';
import {colors} from '../../utils/constants';
import {toReadableDate} from '../../utils/dateUtils';

const dashboardHeaderDay = require('../../assets/images/dashboard-header.webp');
const dashboardHeaderDark = require('../../assets/images/dashboard-header-dark.webp');

type Props = NativeStackScreenProps<StudentStackParamList, 'StudentHome'>;
type StatKey = 'present' | 'absent' | 'late' | 'average';
type ActionRoute =
  | 'MyAttendance'
  | 'MyActivities'
  | 'MyScores'
  | 'StudentAnnouncements';
type StudentTabRoute = 'AttendanceTab' | 'ActivitiesTab' | 'AnnouncementsTab';

type OverviewCard = {
  key: StatKey;
  label: string;
  detail: string;
  icon: string;
  color: string;
  tint: string;
  track: string;
  ribbon: string;
};

const overviewCards: OverviewCard[] = [
  {
    key: 'present',
    label: 'Present',
    detail: 'All records',
    icon: 'check-circle-outline',
    color: '#16A34A',
    tint: '#E7F8EE',
    track: '#D9F4E3',
    ribbon: '#D7F3E0',
  },
  {
    key: 'absent',
    label: 'Absent',
    detail: 'All records',
    icon: 'account-remove-outline',
    color: '#EF4444',
    tint: '#FEEBED',
    track: '#FDE0E3',
    ribbon: '#FBE0E2',
  },
  {
    key: 'late',
    label: 'Late',
    detail: 'All records',
    icon: 'clock-outline',
    color: '#F97316',
    tint: '#FFF1E8',
    track: '#FFE4CF',
    ribbon: '#FEE7D2',
  },
  {
    key: 'average',
    label: 'Average',
    detail: 'Overall score',
    icon: 'chart-line',
    color: '#3456E8',
    tint: '#EAF0FF',
    track: '#DDE6FF',
    ribbon: '#DFE8FF',
  },
];

const quickActions: {
  label: string;
  description: string;
  icon: string;
  color: string;
  border: string;
  route: ActionRoute;
  tabRoute: StudentTabRoute;
}[] = [
  {
    label: 'My Attendance',
    description: 'View your records',
    icon: 'calendar-check-outline',
    color: '#2563EB',
    border: '#C7D7FF',
    route: 'MyAttendance',
    tabRoute: 'AttendanceTab',
  },
  {
    label: 'My Activities',
    description: 'Check your tasks',
    icon: 'clipboard-check-outline',
    color: '#7C3AED',
    border: '#DEC9FF',
    route: 'MyActivities',
    tabRoute: 'ActivitiesTab',
  },
  {
    label: 'My Scores',
    description: 'View your grades',
    icon: 'chart-box-outline',
    color: '#16A34A',
    border: '#BCE8CD',
    route: 'MyScores',
    tabRoute: 'ActivitiesTab',
  },
  {
    label: 'Announcements',
    description: 'Read updates',
    icon: 'bullhorn-outline',
    color: '#F97316',
    border: '#FFD6B7',
    route: 'StudentAnnouncements',
    tabRoute: 'AnnouncementsTab',
  },
];

const getHeroPresentation = (now = new Date()) => {
  const hour = now.getHours();
  if (hour < 6) {
    return {
      greeting: 'Good evening,',
      headerImage: dashboardHeaderDark,
    };
  }
  if (hour < 12) {
    return {
      greeting: 'Good morning,',
      headerImage: dashboardHeaderDay,
    };
  }
  if (hour < 18) {
    return {
      greeting: 'Good afternoon,',
      headerImage: dashboardHeaderDay,
    };
  }
  return {
    greeting: 'Good evening,',
    headerImage: dashboardHeaderDark,
  };
};

const dateFromTimestamp = (value: ActivityRecord['dueDate']) => {
  if (!value) {
    return null;
  }
  return 'toDate' in value ? value.toDate() : value;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const daysUntil = (date: Date) =>
  Math.round(
    (startOfDay(date).getTime() - startOfDay(new Date()).getTime()) /
      (1000 * 60 * 60 * 24),
  );

const daysRemainingLabel = (dueDate: ActivityRecord['dueDate']) => {
  const date = dateFromTimestamp(dueDate);
  if (!date) {
    return 'No due date';
  }
  const remaining = daysUntil(date);
  if (remaining === 0) {
    return 'Due today';
  }
  if (remaining === 1) {
    return '1 day left';
  }
  return `${remaining} days left`;
};

export const StudentDashboardScreen = ({navigation}: Props) => {
  const {width} = useWindowDimensions();
  const {profile, student} = useAuth();
  const isCompact = width < 380;
  const isNarrow = width < 350;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmissionRecord[]>(
    [],
  );
  const [stats, setStats] = useState<Record<StatKey, number>>({
    present: 0,
    absent: 0,
    late: 0,
    average: 0,
  });
  const [attendanceTotal, setAttendanceTotal] = useState(0);

  const heroPresentation = getHeroPresentation();
  const today = useMemo(() => new Date(), []);
  const readableDate = today.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const weekday = today.toLocaleDateString(undefined, {weekday: 'long'});
  const studentName = profile?.fullName || student?.fullName || 'Student';
  const initials = useMemo(
    () =>
      studentName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || 'S',
    [studentName],
  );
  const clampedAverage = Math.max(0, Math.min(100, stats.average));
  const attendancePercentage = (status: Exclude<StatKey, 'average'>) =>
    attendanceTotal > 0
      ? Math.round((stats[status] / attendanceTotal) * 100)
      : 0;
  const navigateToTab = (tabRoute: StudentTabRoute, screen: ActionRoute) => {
    const tabNavigation = navigation.getParent?.();
    if (tabNavigation) {
      tabNavigation.navigate(tabRoute, {screen});
      return;
    }
    navigation.navigate(screen);
  };

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const studentId = profile?.studentId || student?.id;
      const classIds = profile?.classIds?.length
        ? profile.classIds
        : student?.classIds || [];
      if (!studentId) {
        setLoading(false);
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const [attendanceRows, activityRows, submissionRows] = await Promise.all(
          [
            getStudentAttendance(studentId),
            getActivitiesForClasses(classIds),
            getSubmissionsByStudent(studentId),
          ],
        );
        const attendanceSummary = countByStatus(attendanceRows);
        setAttendanceTotal(attendanceRows.length);
        setActivities(activityRows);
        setSubmissions(submissionRows);
        setStats({
          present: attendanceSummary.present || 0,
          absent: attendanceSummary.absent || 0,
          late: attendanceSummary.late || 0,
          average: calculateAverageScore(submissionRows, activityRows),
        });
      } catch {
        setError('We could not load your dashboard. Please try again.');
      } finally {
        if (mode === 'refresh') {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [profile, student],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => load());
    return unsubscribe;
  }, [load, navigation]);

  const upcomingActivity = useMemo(() => {
    const submittedActivityIds = new Set(
      submissions.map(submission => submission.activityId),
    );
    return activities
      .filter(activity => {
        const dueDate = dateFromTimestamp(activity.dueDate);
        return (
          activity.status === 'active' &&
          !submittedActivityIds.has(activity.id) &&
          dueDate !== null &&
          daysUntil(dueDate) >= 0
        );
      })
      .sort(
        (first, second) =>
          (dateFromTimestamp(first.dueDate)?.getTime() || 0) -
          (dateFromTimestamp(second.dueDate)?.getTime() || 0),
      )[0];
  }, [activities, submissions]);

  if (loading) {
    return <LoadingState label="Loading your dashboard..." />;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => load('refresh')}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        style={styles.scroll}>
        <ImageBackground
          resizeMode="cover"
          source={heroPresentation.headerImage}
          style={[styles.hero, isCompact && styles.heroCompact]}>
          <View accessibilityElementsHidden style={styles.heroScrim} />
          <Pressable
            accessibilityLabel="Open announcements"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() =>
              navigateToTab('AnnouncementsTab', 'StudentAnnouncements')
            }
            style={({pressed}) => [
              styles.notificationButton,
              pressed && styles.pressed,
            ]}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={29}
              color="#FFFFFF"
            />
            <View style={styles.notificationDot} />
          </Pressable>

          <Text style={[styles.greeting, isCompact && styles.greetingCompact]}>
            {heroPresentation.greeting}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            numberOfLines={1}
            style={[styles.studentName, isCompact && styles.studentNameCompact]}>
            {studentName}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={2}
            style={[
              styles.heroSubtitle,
              isCompact && styles.heroSubtitleCompact,
            ]}>
            Keep up the great work!{`\n`}You're making progress every day.
          </Text>

          <View style={[styles.avatarRing, isCompact && styles.avatarRingCompact]}>
            <View
              style={[
                styles.avatarInner,
                isCompact && styles.avatarInnerCompact,
              ]}>
              {student?.photoUrl ? (
                <Image
                  accessibilityLabel="Student profile photo"
                  source={{uri: student.photoUrl}}
                  style={styles.dashboardAvatarImage}
                />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="school-outline"
                    size={isCompact ? 44 : 50}
                    color="rgba(255,255,255,0.38)"
                    style={styles.avatarSchoolIcon}
                  />
                  <Text
                    style={[
                      styles.avatarInitials,
                      isCompact && styles.avatarInitialsCompact,
                    ]}>
                    {initials}
                  </Text>
                </>
              )}
            </View>
          </View>
        </ImageBackground>

        <View style={[styles.content, isNarrow && styles.contentNarrow]}>
          <View style={styles.dateCard}>
            <View style={styles.calendarIconWrap}>
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={31}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.dateCopy}>
              <Text style={styles.todayLabel}>Today is</Text>
              <Text numberOfLines={1} style={styles.dateText}>
                {readableDate}
              </Text>
              <Text style={styles.weekdayText}>{weekday}</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={20}
                color="#DC2626"
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.overviewPanel}>
            <View style={styles.overviewPanelHeader}>
              <View style={styles.overviewTitleGroup}>
                <View style={styles.overviewHeaderIcon}>
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={26}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.overviewHeadingCopy}>
                  <Text style={styles.sectionTitle}>Overview</Text>
                  <Text style={styles.overviewSubtitle}>
                    Here's your learning summary
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="View attendance records"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigateToTab('AttendanceTab', 'MyAttendance')}
                style={({pressed}) => [
                  styles.viewAllButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.viewAll}>View all</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={21}
                  color={colors.primary}
                />
              </Pressable>
            </View>

            <View style={styles.overviewGrid}>
              {overviewCards.map(card => {
                const progress =
                  card.key === 'average'
                    ? clampedAverage
                    : attendancePercentage(card.key);
                return (
                  <View
                    key={card.key}
                    style={[styles.overviewCard, styles.overviewCardWide]}>
                    <View
                      accessibilityElementsHidden
                      style={[styles.overviewDot, styles.overviewDotLeft, {backgroundColor: card.color}]}
                    />
                    <View
                      accessibilityElementsHidden
                      style={[styles.overviewDot, styles.overviewDotRight, {backgroundColor: card.color}]}
                    />
                    <View
                      style={[
                        styles.overviewIconWrap,
                        {backgroundColor: card.tint},
                      ]}>
                      <MaterialCommunityIcons
                        name={card.icon}
                        size={isCompact ? 25 : 27}
                        color={card.color}
                      />
                    </View>
                    <Text style={styles.overviewValue}>
                      {card.key === 'average'
                        ? `${clampedAverage}%`
                        : stats[card.key]}
                    </Text>
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                      numberOfLines={1}
                      style={styles.overviewLabel}>
                      {card.label}
                    </Text>
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      numberOfLines={1}
                      style={styles.overviewDetail}>
                      {card.detail}
                    </Text>
                    <View style={styles.overviewProgressRow}>
                      <View
                        style={[
                          styles.overviewProgressTrack,
                          {backgroundColor: card.track},
                        ]}>
                        <View
                          style={[
                            styles.overviewProgressFill,
                            {backgroundColor: card.color, width: `${progress}%`},
                          ]}
                        />
                      </View>
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        numberOfLines={1}
                        style={[styles.overviewProgressText, {color: card.color}]}>
                        {progress}%
                      </Text>
                    </View>
                    <View
                      accessibilityElementsHidden
                      style={[styles.overviewRibbon, {backgroundColor: card.ribbon}]}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionGrid}>
            {quickActions.map(action => (
              <Pressable
                accessibilityLabel={action.label}
                accessibilityRole="button"
                key={action.route}
                onPress={() => navigateToTab(action.tabRoute, action.route)}
                style={({pressed}) => [
                  styles.quickActionCard,
                  {borderColor: action.border},
                  isCompact && styles.quickActionCardCompact,
                  pressed && styles.pressed,
                ]}>
                <View
                  style={[
                    styles.quickActionIconWrap,
                    {backgroundColor: action.color},
                  ]}>
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={24}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.quickActionCopy}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                    numberOfLines={1}
                    style={styles.quickActionLabel}>
                    {action.label}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                    numberOfLines={1}
                    style={styles.quickActionDescription}>
                    {action.description}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={19}
                  color="#7181A0"
                />
              </Pressable>
            ))}
          </View>

          <Text style={styles.upcomingSectionTitle}>Upcoming</Text>
          {upcomingActivity ? (
            <Pressable
              accessibilityLabel={`Open upcoming activity ${upcomingActivity.title}`}
              accessibilityRole="button"
              onPress={() => navigateToTab('ActivitiesTab', 'MyActivities')}
              style={({pressed}) => [
                styles.upcomingCard,
                pressed && styles.pressed,
              ]}>
              <View style={styles.upcomingIcon}>
                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={27}
                  color={colors.primary}
                />
              </View>
              <View style={styles.upcomingCopy}>
                <Text numberOfLines={1} style={styles.upcomingTitle}>
                  {upcomingActivity.title}
                </Text>
                <Text numberOfLines={1} style={styles.upcomingDate}>
                  {toReadableDate(upcomingActivity.dueDate)}
                </Text>
              </View>
              <View style={styles.daysLeftBadge}>
                <Text style={styles.daysLeftText}>
                  {daysRemainingLabel(upcomingActivity.dueDate)}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color="#7181A0"
              />
            </Pressable>
          ) : (
            <View style={styles.noUpcomingCard}>
              <View style={styles.noUpcomingIcon}>
                <MaterialCommunityIcons
                  name="calendar-check-outline"
                  size={24}
                  color="#16A34A"
                />
              </View>
              <View style={styles.upcomingCopy}>
                <Text style={styles.upcomingTitle}>No upcoming activities</Text>
                <Text style={styles.upcomingDate}>
                  You're all caught up for now.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {backgroundColor: '#F5F8FD', flex: 1},
  scroll: {backgroundColor: '#F5F8FD', flex: 1},
  scrollContent: {paddingBottom: 30},
  hero: {
    minHeight: 320,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 66,
  },
  heroCompact: {
    minHeight: 306,
    paddingHorizontal: 20,
  },
  heroScrim: {
    backgroundColor: 'rgba(5, 78, 200, 0.2)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  notificationButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: 21,
    top: 57,
    width: 42,
  },
  notificationDot: {
    backgroundColor: '#FF5462',
    borderColor: '#0B55E8',
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    position: 'absolute',
    right: 1,
    top: 1,
    width: 14,
  },
  greeting: {color: '#EAF1FF', fontSize: 21, fontWeight: '500'},
  greetingCompact: {fontSize: 20},
  studentName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1.1,
    lineHeight: 34,
    marginTop: 6,
    maxWidth: '55%',
    textTransform: 'uppercase',
  },
  studentNameCompact: {fontSize: 25, lineHeight: 30},
  heroSubtitle: {
    color: '#ECF3FF',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    marginTop: 15,
    maxWidth: '60%',
  },
  heroSubtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 13,
    maxWidth: '58%',
  },
  avatarRing: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 66,
    height: 132,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    top: 116,
    width: 132,
  },
  avatarRingCompact: {
    height: 116,
    right: 20,
    top: 128,
    width: 116,
  },
  avatarInner: {
    alignItems: 'center',
    backgroundColor: '#7DA8FF',
    borderRadius: 60,
    height: 120,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 120,
  },
  avatarInnerCompact: {borderRadius: 52, height: 104, width: 104},
  dashboardAvatarImage: {height: '100%', width: '100%'},
  avatarSchoolIcon: {position: 'absolute', top: 21},
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -2,
    marginTop: 14,
  },
  avatarInitialsCompact: {fontSize: 31, marginTop: 11},
  content: {
    marginTop: -54,
    paddingHorizontal: 24,
  },
  contentNarrow: {paddingHorizontal: 18},
  dateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    elevation: 8,
    flexDirection: 'row',
    minHeight: 112,
    padding: 14,
    shadowColor: '#1A407D',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  calendarIconWrap: {
    alignItems: 'center',
    backgroundColor: '#2E5AEF',
    borderRadius: 17,
    height: 70,
    justifyContent: 'center',
    width: 70,
  },
  dateCopy: {marginLeft: 15, minWidth: 0},
  todayLabel: {color: '#52617E', fontSize: 14, fontWeight: '700'},
  dateText: {
    color: '#2855E8',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  weekdayText: {color: '#52617E', fontSize: 15, fontWeight: '600', marginTop: 2},
  errorCard: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 20,
    padding: 13,
  },
  errorText: {color: '#B91C1C', flex: 1, fontSize: 14, fontWeight: '700'},
  overviewPanel: {
    marginTop: 36,
  },
  overviewPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewTitleGroup: {alignItems: 'center', flex: 1, flexDirection: 'row'},
  overviewHeaderIcon: {
    alignItems: 'center',
    backgroundColor: '#1E63EE',
    borderRadius: 20,
    elevation: 4,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#1E63EE',
    shadowOffset: {height: 4, width: 0},
    shadowOpacity: 0.24,
    shadowRadius: 8,
    width: 40,
  },
  overviewHeadingCopy: {flex: 1, marginLeft: 10, minWidth: 0},
  overviewSubtitle: {
    color: '#66799E',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  sectionTitle: {
    color: '#102D60',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  viewAllButton: {
    alignItems: 'center',
    backgroundColor: '#F7F9FF',
    borderColor: '#E1E9FB',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginLeft: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  viewAll: {color: colors.primary, fontSize: 12, fontWeight: '900'},
  overviewGrid: {flexDirection: 'row', gap: 8, marginTop: 18, width: '100%'},
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EDF1F8',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 1,
    minHeight: 204,
    overflow: 'hidden',
    padding: 9,
    shadowColor: '#6A7EA5',
    shadowOffset: {height: 4, width: 0},
    shadowOpacity: 0.06,
    shadowRadius: 11,
  },
  overviewCardWide: {flex: 1, minWidth: 0},
  overviewIconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  overviewDot: {borderRadius: 4, height: 8, opacity: 0.32, position: 'absolute', width: 8},
  overviewDotLeft: {left: 13, top: 64},
  overviewDotRight: {right: 13, top: 71},
  overviewValue: {
    color: '#112B5D',
    alignSelf: 'center',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.9,
    marginTop: 13,
  },
  overviewLabel: {
    alignSelf: 'center',
    color: '#132956',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  overviewDetail: {
    color: '#7181A0',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 9,
    textAlign: 'center',
  },
  overviewProgressRow: {
    alignItems: 'center',
    bottom: 23,
    flexDirection: 'row',
    left: 9,
    position: 'absolute',
    right: 9,
  },
  overviewProgressTrack: {
    borderRadius: 5,
    flex: 1,
    height: 7,
    overflow: 'hidden',
  },
  overviewProgressFill: {borderRadius: 5, height: '100%', minWidth: 0},
  overviewProgressText: {fontSize: 10, fontWeight: '900', marginLeft: 5, minWidth: 21},
  overviewRibbon: {
    borderRadius: 32,
    bottom: -24,
    height: 42,
    left: -20,
    position: 'absolute',
    right: -20,
  },
  quickActionsTitle: {
    color: '#102D60',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 36,
  },
  quickActionGrid: {
    columnGap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
    rowGap: 10,
  },
  quickActionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#6A7EA5',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.06,
    shadowRadius: 10,
    width: '48.5%',
  },
  quickActionCardCompact: {minHeight: 70, paddingHorizontal: 9},
  quickActionIconWrap: {
    alignItems: 'center',
    borderRadius: 13,
    elevation: 4,
    height: 43,
    justifyContent: 'center',
    shadowColor: '#3158EA',
    shadowOffset: {height: 4, width: 0},
    shadowOpacity: 0.22,
    shadowRadius: 7,
    width: 43,
  },
  quickActionCopy: {flex: 1, marginLeft: 8, minWidth: 0},
  quickActionLabel: {color: '#142A58', fontSize: 12, fontWeight: '900', lineHeight: 16},
  quickActionDescription: {color: '#687A9D', fontSize: 10, fontWeight: '600', lineHeight: 13, marginTop: 2},
  upcomingSectionTitle: {
    color: '#102D60',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 17,
    marginTop: 36,
  },
  upcomingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    elevation: 3,
    flexDirection: 'row',
    minHeight: 100,
    padding: 14,
    shadowColor: '#6A7EA5',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  noUpcomingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    flexDirection: 'row',
    minHeight: 94,
    padding: 14,
  },
  upcomingIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF0FF',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  noUpcomingIcon: {
    alignItems: 'center',
    backgroundColor: '#E7F8EE',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  upcomingCopy: {flex: 1, marginLeft: 12, minWidth: 0},
  upcomingTitle: {color: '#142A58', fontSize: 16, fontWeight: '900'},
  upcomingDate: {color: '#6B7B99', fontSize: 13, fontWeight: '600', marginTop: 4},
  daysLeftBadge: {backgroundColor: '#EAF0FF', borderRadius: 12, marginRight: 7, paddingHorizontal: 9, paddingVertical: 7},
  daysLeftText: {color: '#3158EA', fontSize: 12, fontWeight: '900'},
  pressed: {opacity: 0.76, transform: [{scale: 0.98}]},
});
