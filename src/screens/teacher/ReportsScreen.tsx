import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Button, Menu, Text} from 'react-native-paper';
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
        title="Reports"
        subtitle="Attendance, activities, performance, and missing work."
      />
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setMenuVisible(true)}>
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
      <AppButton onPress={generate}>
        Generate Reports
      </AppButton>
      <AppCard>
        <Text variant="titleMedium" style={styles.cardTitle}>
          Attendance Report
        </Text>
        <Text style={styles.cardText}>Present: {attendanceSummary.present || 0}</Text>
        <Text style={styles.cardText}>Absent: {attendanceSummary.absent || 0}</Text>
        <Text style={styles.cardText}>Late: {attendanceSummary.late || 0}</Text>
        <Text style={styles.cardText}>Excused: {attendanceSummary.excused || 0}</Text>
      </AppCard>
      <AppCard>
        <Text variant="titleMedium" style={styles.cardTitle}>
          Activity Report
        </Text>
        <Text style={styles.cardText}>Submitted: {activitySummary.submitted || 0}</Text>
        <Text style={styles.cardText}>Missing: {activitySummary.missing || 0}</Text>
        <Text style={styles.cardText}>Late: {activitySummary.late || 0}</Text>
        <Text style={styles.cardText}>Excused: {activitySummary.excused || 0}</Text>
      </AppCard>
      <AppCard>
        <Text variant="titleMedium" style={styles.cardTitle}>
          Student Performance
        </Text>
        <Text style={styles.cardText}>
          Use class filters above to review attendance and activity totals.
          Per-student drilldown can be added from this screen later.
        </Text>
      </AppCard>
      <AppCard>
        <Text variant="titleMedium" style={styles.cardTitle}>
          Missing Activity Report
        </Text>
        <Text style={styles.cardText}>
          Missing activities: {activitySummary.missing || 0}
        </Text>
      </AppCard>
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardText: {
    color: '#3B4968',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 6,
  },
  cardTitle: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
});
