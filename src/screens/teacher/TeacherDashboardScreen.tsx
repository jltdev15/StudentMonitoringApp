import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
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
import {getAttendanceByClassAndDate} from '../../services/attendanceService';
import {getTeacherClasses} from '../../services/classService';
import {countByStatus} from '../../services/reportService';
import {getStudentsByClass} from '../../services/studentService';
import {TeacherStackParamList} from '../../types/navigation';
import {colors} from '../../utils/constants';
import {toDateString} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'TeacherHome'>;
type ActionRoute = 'Attendance' | 'CreateActivity' | 'AddStudent' | 'Reports';
type StatKey = 'students' | 'present' | 'absent' | 'late';

type OverviewCard = {
  key: StatKey;
  label: string;
  detail: string;
  icon: string;
  color: string;
  tint: string;
};

const overviewCards: OverviewCard[] = [
  {
    key: 'students',
    label: 'Students',
    detail: 'Total enrolled',
    icon: 'account-group',
    color: '#2563EB',
    tint: '#E9F0FF',
  },
  {
    key: 'present',
    label: 'Present',
    detail: 'Today',
    icon: 'check-circle-outline',
    color: '#16A34A',
    tint: '#E7F8EE',
  },
  {
    key: 'absent',
    label: 'Absent',
    detail: 'Today',
    icon: 'account-remove-outline',
    color: '#EF4444',
    tint: '#FEEBED',
  },
  {
    key: 'late',
    label: 'Late',
    detail: 'Today',
    icon: 'clock-outline',
    color: '#F97316',
    tint: '#FFF1E8',
  },
];

const quickActions: {
  label: string;
  description: string;
  icon: string;
  color: string;
  route: ActionRoute;
}[] = [
  {
    label: 'Take Attendance',
    description: 'Mark students present',
    icon: 'calendar-check-outline',
    color: '#2563EB',
    route: 'Attendance',
  },
  {
    label: 'Create Activity',
    description: 'Add class activity',
    icon: 'plus',
    color: '#7C3AED',
    route: 'CreateActivity',
  },
  {
    label: 'Add Student',
    description: 'Enroll new student',
    icon: 'account-plus-outline',
    color: '#16A34A',
    route: 'AddStudent',
  },
  {
    label: 'View Reports',
    description: 'Check class reports',
    icon: 'chart-box-outline',
    color: '#3B82F6',
    route: 'Reports',
  },
];

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

export const TeacherDashboardScreen = ({navigation}: Props) => {
  const {profile} = useAuth();
  const {width} = useWindowDimensions();
  const isCompact = width < 380;
  const isNarrow = width < 350;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Record<StatKey, number>>({
    students: 0,
    present: 0,
    absent: 0,
    late: 0,
  });

  const today = useMemo(() => new Date(), []);
  const readableDate = today.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const weekday = today.toLocaleDateString(undefined, {weekday: 'long'});

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!profile) {
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
        const classes = await getTeacherClasses(profile.uid);
        const [studentsByClass, attendanceByClass] = await Promise.all([
          Promise.all(classes.map(item => getStudentsByClass(item.id))),
          Promise.all(
            classes.map(item =>
              getAttendanceByClassAndDate(item.id, toDateString()),
            ),
          ),
        ]);
        const attendanceSummary = countByStatus(attendanceByClass.flat());
        const uniqueStudents = new Set(
          studentsByClass.flat().map(student => student.id),
        );

        setStats({
          students: uniqueStudents.size,
          present: attendanceSummary.present || 0,
          absent: attendanceSummary.absent || 0,
          late: attendanceSummary.late || 0,
        });
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

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => load());
    return unsubscribe;
  }, [load, navigation]);

  if (loading) {
    return <LoadingState label="Loading dashboard..." />;
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
        <View style={[styles.hero, isCompact && styles.heroCompact]}>
          <View style={styles.heroOrbLeft} />
          <View style={styles.heroOrbRight} />
          <View style={styles.heroWave} />
          <View style={styles.heroTopRow}>
            <View />
            <Pressable
              accessibilityLabel="Open announcements"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => navigation.navigate('Announcements')}
              style={({pressed}) => [
                styles.notificationButton,
                pressed && styles.pressed,
              ]}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={28}
                color="#FFFFFF"
              />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>

          <Text style={[styles.greeting, isCompact && styles.greetingCompact]}>
            {getGreeting()}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.68}
            numberOfLines={1}
            style={[
              styles.teacherName,
              isCompact && styles.teacherNameCompact,
            ]}>
            {profile?.fullName || 'Teacher'}
          </Text>
          <Text
            style={[
              styles.heroSubtitle,
              isCompact && styles.heroSubtitleCompact,
            ]}>
            Here's what's happening in your classes today.
          </Text>

          <View
            style={[styles.dateBadge, isCompact && styles.dateBadgeCompact]}>
            <View style={styles.calendarIconWrap}>
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={isCompact ? 24 : 28}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.dateCopy}>
              <Text numberOfLines={1} style={styles.dateText}>
                {readableDate}
              </Text>
              <Text style={styles.weekdayText}>{weekday}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.content, isNarrow && styles.contentNarrow]}>
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            <Pressable
              accessibilityLabel="View attendance overview"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => navigation.navigate('AttendanceHome')}
              style={({pressed}) => [
                styles.viewAllButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.viewAll}>View all</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={colors.primary}
              />
            </Pressable>
          </View>

          <View style={styles.overviewGrid}>
            {overviewCards.map(card => (
              <View key={card.key} style={styles.overviewCard}>
                <View
                  style={[
                    styles.overviewIconWrap,
                    {backgroundColor: card.tint},
                  ]}>
                  <MaterialCommunityIcons
                    name={card.icon}
                    size={isCompact ? 28 : 32}
                    color={card.color}
                  />
                </View>
                <Text
                  style={[
                    styles.overviewValue,
                    isCompact && styles.overviewValueCompact,
                  ]}>
                  {stats[card.key]}
                </Text>
                <Text style={styles.overviewLabel}>{card.label}</Text>
                <Text style={styles.overviewDetail}>{card.detail}</Text>
                <View
                  style={[styles.cardAccent, {backgroundColor: card.color}]}
                />
              </View>
            ))}
          </View>

          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionGrid}>
            {quickActions.map(action => (
              <Pressable
                accessibilityLabel={action.label}
                accessibilityRole="button"
                key={action.route}
                onPress={() => navigation.navigate(action.route)}
                style={({pressed}) => [
                  styles.quickActionCard,
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
                    size={isCompact ? 27 : 30}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.quickActionCopy}>
                  <Text numberOfLines={2} style={styles.quickActionLabel}>
                    {action.label}
                  </Text>
                  <Text numberOfLines={2} style={styles.quickActionDescription}>
                    {action.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {backgroundColor: '#F4F7FC', flex: 1},
  scroll: {backgroundColor: '#F4F7FC', flex: 1},
  scrollContent: {paddingBottom: 30},
  hero: {
    backgroundColor: '#083A93',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    minHeight: 235,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 66,
  },
  heroCompact: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    minHeight: 230,
    paddingHorizontal: 20,
  },
  heroOrbLeft: {
    backgroundColor: '#1F6CE5',
    borderRadius: 260,
    height: 470,
    left: -230,
    opacity: 0.58,
    position: 'absolute',
    top: -70,
    width: 470,
  },
  heroOrbRight: {
    backgroundColor: '#0A54C8',
    borderRadius: 280,
    height: 430,
    opacity: 0.8,
    position: 'absolute',
    right: -150,
    top: 40,
    width: 430,
  },
  heroWave: {
    backgroundColor: '#3F85EE',
    borderRadius: 260,
    bottom: -205,
    height: 310,
    left: -70,
    opacity: 0.48,
    position: 'absolute',
    transform: [{rotate: '-8deg'}],
    width: 620,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    position: 'absolute',
    right: 20,
    top: 57,
  },
  notificationButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    width: 40,
  },
  notificationDot: {
    backgroundColor: '#FF4D5B',
    borderColor: '#0D4AA5',
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    position: 'absolute',
    right: 1,
    top: 2,
    width: 14,
  },
  greeting: {color: '#E7F0FF', fontSize: 21, fontWeight: '500'},
  greetingCompact: {fontSize: 20},
  teacherName: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 5,
  },
  teacherNameCompact: {fontSize: 28},
  heroSubtitle: {
    color: '#E6EFFF',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginTop: 13,
    maxWidth: 220,
  },
  heroSubtitleCompact: {fontSize: 15, lineHeight: 21, marginTop: 11},
  dateBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 21,
    flexDirection: 'row',
    padding: 8,
    position: 'absolute',
    right: 24,
    shadowColor: '#0A2F71',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.22,
    shadowRadius: 10,
    top: 143,
    width: 170,
  },
  dateBadgeCompact: {right: 20},
  calendarIconWrap: {
    alignItems: 'center',
    backgroundColor: '#2563DF',
    borderRadius: 13,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  dateCopy: {marginLeft: 10, minWidth: 0},
  dateText: {color: '#132956', fontSize: 16, fontWeight: '900'},
  weekdayText: {
    color: '#657391',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  content: {paddingHorizontal: 24, paddingTop: 22},
  contentNarrow: {paddingHorizontal: 18},
  errorCard: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 24,
    padding: 13,
  },
  errorText: {color: '#B91C1C', flex: 1, fontSize: 14, fontWeight: '700'},
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#102D60',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  viewAllButton: {alignItems: 'center', flexDirection: 'row'},
  viewAll: {color: colors.primary, fontSize: 15, fontWeight: '800'},
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
    marginTop: 18,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    minHeight: 168,
    overflow: 'hidden',
    padding: 14,
    shadowColor: '#6A7EA5',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 11,
    width: '47%',
  },
  overviewIconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 49,
    justifyContent: 'center',
    width: 49,
  },
  overviewValue: {
    color: '#112B5D',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: 13,
  },
  overviewValueCompact: {fontSize: 28},
  overviewLabel: {
    color: '#132956',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 1,
  },
  overviewDetail: {
    color: '#7181A0',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
  },
  cardAccent: {
    borderRadius: 5,
    bottom: 10,
    height: 4,
    left: 14,
    position: 'absolute',
    width: 55,
  },
  quickActionsTitle: {
    color: '#102D60',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 30,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 16,
  },
  quickActionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    flexDirection: 'row',
    minHeight: 102,
    paddingHorizontal: 13,
    paddingVertical: 13,
    shadowColor: '#6A7EA5',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 10,
    width: '47%',
  },
  quickActionCardCompact: {
    minHeight: 96,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  quickActionIconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    shadowColor: '#4B67A0',
    shadowOffset: {height: 4, width: 0},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    width: 46,
  },
  quickActionCopy: {flex: 1, marginLeft: 9, minWidth: 0},
  quickActionLabel: {
    color: '#142A58',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  quickActionDescription: {
    color: '#687A9D',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    marginTop: 3,
  },
  pressed: {opacity: 0.76, transform: [{scale: 0.98}]},
});
