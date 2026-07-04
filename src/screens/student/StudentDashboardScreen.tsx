import React, {useCallback, useEffect, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppCard} from '../../components/AppCard';
import {LoadingState} from '../../components/LoadingState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getAnnouncementsForStudent} from '../../services/announcementService';
import {
  getActivitiesForClasses,
  getSubmissionsByStudent,
} from '../../services/activityService';
import {getStudentAttendance} from '../../services/attendanceService';
import {
  calculateAverageScore,
  countByStatus,
} from '../../services/reportService';
import {AnnouncementRecord} from '../../types/models';
import {StudentStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<StudentStackParamList, 'StudentHome'>;

type MetricProps = {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  tint: string;
};

type QuickActionProps = {
  label: string;
  icon: string;
  onPress: () => void;
};

const Metric = ({label, value, icon, color, tint}: MetricProps) => (
  <View style={styles.metric}>
    <View style={[styles.metricIcon, {backgroundColor: tint}]}>
      <MaterialCommunityIcons name={icon} size={23} color={color} />
    </View>
    <Text numberOfLines={1} style={styles.metricValue}>
      {value}
    </Text>
    <Text numberOfLines={1} style={styles.metricLabel}>
      {label}
    </Text>
  </View>
);

const QuickAction = ({label, icon, onPress}: QuickActionProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({pressed}) => [styles.quickAction, pressed && styles.pressed]}>
    <MaterialCommunityIcons name={icon} size={28} color="#2563EB" />
    <Text numberOfLines={2} style={styles.quickActionText}>
      {label}
    </Text>
  </Pressable>
);

export const StudentDashboardScreen = ({navigation}: Props) => {
  const {width} = useWindowDimensions();
  const {profile, student} = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Record<string, number>>({});
  const [activities, setActivities] = useState<Record<string, number>>({});
  const [average, setAverage] = useState(0);
  const [announcement, setAnnouncement] = useState<AnnouncementRecord | null>(
    null,
  );

  const isCompact = width < 380;
  const studentName = profile?.fullName || student?.fullName || 'Student';

  const load = useCallback(async () => {
    const studentId = profile?.studentId || student?.id;
    const classIds = profile?.classIds?.length
      ? profile.classIds
      : student?.classIds || [];
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [attendanceRows, activityRows, submissions, announcements] =
      await Promise.all([
        getStudentAttendance(studentId),
        getActivitiesForClasses(classIds),
        getSubmissionsByStudent(studentId),
        getAnnouncementsForStudent(classIds),
      ]);
    setAttendance(countByStatus(attendanceRows));
    setActivities(countByStatus(submissions));
    setAverage(calculateAverageScore(submissions, activityRows));
    setAnnouncement(announcements[0] || null);
    setLoading(false);
  }, [profile, student]);

  useEffect(() => navigation.addListener('focus', load), [load, navigation]);

  if (loading) {
    return <LoadingState label="Loading your dashboard..." />;
  }

  return (
    <Screen style={styles.screen}>
      <View style={[styles.hero, isCompact && styles.heroCompact]}>
        <View style={styles.heroGlow} />
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={[styles.studentName, isCompact && styles.studentNameCompact]}>
          {studentName}
        </Text>
        <Text style={styles.heroSubtitle}>
          Track your attendance, activities, and scores.
        </Text>
      </View>

      <AppCard style={styles.overviewCard}>
        <Text style={styles.cardTitle}>Attendance Summary</Text>
        <View style={styles.metricsRow}>
          <Metric
            label="Present"
            value={attendance.present || 0}
            icon="check-circle-outline"
            color="#16A34A"
            tint="#E7F8EF"
          />
          <Metric
            label="Absent"
            value={attendance.absent || 0}
            icon="account-remove-outline"
            color="#DC2626"
            tint="#FDECEF"
          />
          <Metric
            label="Late"
            value={attendance.late || 0}
            icon="clock-outline"
            color="#F97316"
            tint="#FFF4E5"
          />
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Activity Summary</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryTile}>
          <Metric
            label="Submitted"
            value={activities.submitted || 0}
            icon="file-check-outline"
            color="#16A34A"
            tint="#E7F8EF"
          />
        </View>
        <View style={styles.summaryTile}>
          <Metric
            label="Missing"
            value={activities.missing || 0}
            icon="file-alert-outline"
            color="#DC2626"
            tint="#FDECEF"
          />
        </View>
        <View style={styles.summaryTile}>
          <Metric
            label="Average"
            value={`${average}%`}
            icon="chart-line"
            color="#2563EB"
            tint="#E8F1FF"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Latest Announcement</Text>
      <AppCard style={styles.announcementCard}>
        <View style={styles.announcementIcon}>
          <MaterialCommunityIcons
            name="bullhorn-outline"
            size={24}
            color="#2563EB"
          />
        </View>
        <View style={styles.announcementCopy}>
          <Text numberOfLines={1} style={styles.announcementTitle}>
            {announcement?.title || 'No announcements yet'}
          </Text>
          <Text numberOfLines={3} style={styles.announcementText}>
            {announcement?.message ||
              'Class announcements will appear here when posted.'}
          </Text>
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickGrid}>
        <QuickAction
          icon="calendar-check-outline"
          label="My Attendance"
          onPress={() => navigation.navigate('MyAttendance')}
        />
        <QuickAction
          icon="book-open-page-variant-outline"
          label="My Activities"
          onPress={() => navigation.navigate('MyActivities')}
        />
        <QuickAction
          icon="chart-line"
          label="My Scores"
          onPress={() => navigation.navigate('MyScores')}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  announcementCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  announcementCopy: {
    flex: 1,
    minWidth: 0,
  },
  announcementIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  announcementText: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 4,
  },
  announcementTitle: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '900',
  },
  cardTitle: {
    color: '#081638',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },
  greeting: {
    color: '#E7EEFD',
    fontSize: 16,
    fontWeight: '800',
  },
  hero: {
    backgroundColor: '#062A66',
    marginBottom: -6,
    marginHorizontal: -20,
    marginTop: -20,
    minHeight: 170,
    overflow: 'hidden',
    paddingBottom: 34,
    paddingHorizontal: 24,
    paddingTop: 34,
  },
  heroCompact: {
    minHeight: 150,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  heroGlow: {
    backgroundColor: '#0C3D87',
    borderRadius: 130,
    height: 260,
    opacity: 0.28,
    position: 'absolute',
    right: -96,
    top: -116,
    width: 260,
  },
  heroSubtitle: {
    color: '#E7EEFD',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 6,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
    minWidth: 84,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    marginBottom: 8,
    width: 42,
  },
  metricLabel: {
    color: '#31405F',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricValue: {
    color: '#030C29',
    fontSize: 23,
    fontWeight: '900',
  },
  overviewCard: {
    marginBottom: 18,
  },
  pressed: {
    opacity: 0.82,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 3,
    flex: 1,
    gap: 8,
    minHeight: 104,
    minWidth: 94,
    paddingHorizontal: 10,
    paddingVertical: 18,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  quickActionText: {
    color: '#081638',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    textAlign: 'center',
  },
  quickGrid: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 10,
  },
  screen: {
    paddingBottom: 46,
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 2,
  },
  studentName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 8,
  },
  studentNameCompact: {
    fontSize: 26,
  },
  summaryGrid: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  summaryTile: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    minWidth: 92,
    minHeight: 118,
    padding: 12,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
});
