import React, {useCallback, useEffect, useState} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {Button, Menu, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {
  getActivitiesByClass,
  getSubmissionsByActivity,
} from '../../services/activityService';
import {getAttendanceByClassRange} from '../../services/attendanceService';
import {getTeacherClasses} from '../../services/classService';
import {countByStatus} from '../../services/reportService';
import {ClassRecord} from '../../types/models';
import {toDateString} from '../../utils/dateUtils';

type ReportCardProps = {
  title: string;
  icon: string;
  color: string;
  rows?: {label: string; value: number}[];
  message?: string;
  style?: StyleProp<ViewStyle>;
};

const ReportCard = ({
  title,
  icon,
  color,
  rows = [],
  message,
  style,
}: ReportCardProps) => (
  <AppCard style={[styles.reportCard, style]}>
    <View style={styles.reportHeader}>
      <View style={[styles.reportIcon, {backgroundColor: `${color}18`}]}>
        <MaterialCommunityIcons name={icon} size={23} color={color} />
      </View>
      <Text variant="titleMedium" style={styles.cardTitle}>
        {title}
      </Text>
    </View>
    {rows.map(row => (
      <View key={row.label} style={styles.metricRow}>
        <Text style={styles.metricLabel}>{row.label}</Text>
        <Text style={[styles.metricValue, {color}]}>{row.value}</Text>
      </View>
    ))}
    {message ? <Text style={styles.cardText}>{message}</Text> : null}
  </AppCard>
);

export const ReportsScreen = () => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState('');
  const [startDate, setStartDate] = useState(toDateString());
  const [endDate, setEndDate] = useState(toDateString());
  const [menuVisible, setMenuVisible] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<
    Record<string, number>
  >({});
  const [activitySummary, setActivitySummary] = useState<
    Record<string, number>
  >({});

  const loadClasses = useCallback(async () => {
    if (profile) {
      const nextClasses = await getTeacherClasses(profile.uid);
      setClasses(nextClasses);
      setClassId(current => current || nextClasses[0]?.id || '');
    }
  }, [profile]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const generate = async () => {
    if (!classId) {
      return;
    }
    const attendance = await getAttendanceByClassRange(
      classId,
      startDate,
      endDate,
    );
    const activities = await getActivitiesByClass(classId);
    const submissions = (
      await Promise.all(
        activities.map(activity => getSubmissionsByActivity(activity.id)),
      )
    ).flat();
    setAttendanceSummary(countByStatus(attendance));
    setActivitySummary(countByStatus(submissions));
  };

  const selectedClass = classes.find(item => item.id === classId);

  return (
    <Screen>
      <AppHeader
        variant="teacher"
        title="Reports"
        subtitle="Attendance, activities, performance, and missing work."
        showBack={false}
      />
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            contentStyle={styles.classPickerContent}
            icon="school-outline"
            labelStyle={styles.classPickerLabel}
            mode="outlined"
            onPress={() => setMenuVisible(true)}
            style={styles.classPicker}>
            {selectedClass ? selectedClass.className : 'Select class'}
          </Button>
        }>
        {classes.map(item => (
          <Menu.Item
            key={item.id}
            title={item.className}
            onPress={() => {
              setClassId(item.id);
              setMenuVisible(false);
            }}
          />
        ))}
      </Menu>
      <AppTextInput
        label="Start date"
        value={startDate}
        onChangeText={setStartDate}
      />
      <AppTextInput
        label="End date"
        value={endDate}
        onChangeText={setEndDate}
      />
      <AppButton onPress={generate}>Generate Reports</AppButton>
      <Text style={styles.summaryTitle}>Report Summary</Text>
      <View style={styles.reportGrid}>
        <ReportCard
          title="Attendance"
          icon="calendar-check-outline"
          color="#16A34A"
          rows={[
            {label: 'Present', value: attendanceSummary.present || 0},
            {label: 'Absent', value: attendanceSummary.absent || 0},
            {label: 'Late', value: attendanceSummary.late || 0},
          ]}
          style={styles.halfCard}
        />
        <ReportCard
          title="Activities"
          icon="clipboard-check-outline"
          color="#2563EB"
          rows={[
            {label: 'Submitted', value: activitySummary.submitted || 0},
            {label: 'Missing', value: activitySummary.missing || 0},
            {label: 'Late', value: activitySummary.late || 0},
          ]}
          style={styles.halfCard}
        />
      </View>
      <ReportCard
        title="Student Performance"
        icon="chart-line"
        color="#7C3AED"
        message="Use the selected class and date range to review attendance, activity, and missing-work trends."
      />
      <ReportCard
        title="Missing Activities"
        icon="file-alert-outline"
        color="#EF4444"
        rows={[
          {label: 'Missing activities', value: activitySummary.missing || 0},
        ]}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardText: {
    color: '#7181A0',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 12,
  },
  cardTitle: {
    color: '#112B5D',
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  classPicker: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE8FA',
    borderRadius: 16,
    marginBottom: 16,
  },
  classPickerContent: {height: 52, justifyContent: 'flex-start'},
  classPickerLabel: {color: '#112B5D', fontSize: 15, fontWeight: '800'},
  halfCard: {width: '48%'},
  metricLabel: {color: '#7181A0', fontSize: 12, fontWeight: '700'},
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  metricValue: {fontSize: 15, fontWeight: '900'},
  reportCard: {borderColor: '#EEF3FA', borderRadius: 19, padding: 15},
  reportGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportHeader: {alignItems: 'center', flexDirection: 'row', gap: 9},
  reportIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  summaryTitle: {
    color: '#112B5D',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 14,
    marginTop: 27,
  },
});
