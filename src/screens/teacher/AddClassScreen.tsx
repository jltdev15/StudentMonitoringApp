import React, {useState} from 'react';
import {Pressable, StyleSheet, useWindowDimensions, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {HelperText, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {AppHeader} from '../../components/AppHeader';
import {AppSelect} from '../../components/AppSelect';
import {AppTextInput} from '../../components/AppTextInput';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {createClass} from '../../services/classService';
import {TeacherStackParamList} from '../../types/navigation';
import {
  ScheduleEntry,
  classScheduleDays,
  classScheduleTimeSlots,
  emptyScheduleEntry,
  serializeScheduleEntries,
} from '../../utils/classScheduleUtils';
import {required} from '../../utils/validationUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'AddClass'>;

type ScheduleRow = ScheduleEntry & {
  id: string;
};

type ClassStep = 0 | 1 | 2;

let scheduleRowId = 0;

const classSteps = ['Class Details', 'Schedule', 'Review'];

const stepSubtitles = [
  'Start with the core class information.',
  'Add the days and time slots for this class.',
  'Check the class information before saving.',
];

const createScheduleRow = (): ScheduleRow => ({
  ...emptyScheduleEntry(),
  id: `schedule-${scheduleRowId++}`,
});

export const AddClassScreen = ({navigation}: Props) => {
  const {profile} = useAuth();
  const {width} = useWindowDimensions();
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [section, setSection] = useState('');
  const [schedules, setSchedules] = useState<ScheduleRow[]>([
    createScheduleRow(),
  ]);
  const [currentStep, setCurrentStep] = useState<ClassStep>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const shouldStackTimeFields = width < 420;

  const validateDetails = () =>
    required(className, 'Class name') ||
    required(subject, 'Subject') ||
    required(gradeLevel, 'Grade level') ||
    required(section, 'Section');

  const validateSchedules = () => {
    const invalidScheduleIndex = schedules.findIndex(
      scheduleItem =>
        !scheduleItem.day ||
        !scheduleItem.startTime ||
        !scheduleItem.endTime,
    );

    if (invalidScheduleIndex >= 0) {
      return `Complete schedule ${invalidScheduleIndex + 1} before continuing.`;
    }

    return '';
  };

  const goToSchedule = () => {
    const validation = validateDetails();
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    setCurrentStep(1);
  };

  const goToReview = () => {
    const validation = validateSchedules();
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const updateSchedule = (id: string, changes: Partial<ScheduleEntry>) => {
    setSchedules(current =>
      current.map(item =>
        item.id === id ? {...item, ...changes} : item,
      ),
    );
  };

  const addSchedule = () => {
    setSchedules(current => [...current, createScheduleRow()]);
  };

  const removeSchedule = (id: string) => {
    setSchedules(current =>
      current.length > 1
        ? current.filter(item => item.id !== id)
        : current,
    );
  };

  const save = async () => {
    const validation = validateDetails() || validateSchedules();
    if (validation || !profile) {
      setError(validation || 'Teacher account not loaded.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createClass({
        className,
        subject,
        gradeLevel,
        section,
        schedule: serializeScheduleEntries(
          schedules.map(({id: _id, ...entry}) => entry),
        ),
        teacherId: profile.uid,
      });
      navigation.goBack();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save this class. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepper}>
      {classSteps.map((label, index) => {
        const isActive = currentStep === index;
        const isComplete = currentStep > index;
        return (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepBadge,
                isActive && styles.stepBadgeActive,
                isComplete && styles.stepBadgeComplete,
              ]}>
              {isComplete ? (
                <MaterialCommunityIcons name="check" size={15} color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    isActive && styles.stepNumberActive,
                  ]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                isComplete && styles.stepLabelComplete,
              ]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const renderDetailsStep = () => (
    <>
      <AppTextInput
        label="Class name"
        placeholder="Example: Grade 7 - Mathematics"
        value={className}
        onChangeText={setClassName}
      />
      <AppTextInput
        label="Subject"
        placeholder="Example: Mathematics"
        value={subject}
        onChangeText={setSubject}
      />
      <AppTextInput
        label="Grade level"
        placeholder="Example: Grade 7"
        value={gradeLevel}
        onChangeText={setGradeLevel}
      />
      <AppTextInput
        label="Section"
        placeholder="Example: Section A"
        value={section}
        onChangeText={setSection}
      />
      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>
      <AppButton onPress={goToSchedule}>Next: Schedule</AppButton>
    </>
  );

  const renderScheduleStep = () => (
    <>
      <Text style={styles.sectionTitle}>Schedule</Text>
      <Text style={styles.scheduleHint}>
        Add one row per day/time slot. Example: Tuesday, 9:00 AM to 10:30 AM.
      </Text>
      {schedules.map((scheduleItem, index) => (
        <View key={scheduleItem.id} style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>Schedule {index + 1}</Text>
            {schedules.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove schedule ${index + 1}`}
                onPress={() => removeSchedule(scheduleItem.id)}
                style={({pressed}) => [
                  styles.removeButton,
                  pressed && styles.pressed,
                ]}>
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color="#DC2626"
                />
              </Pressable>
            ) : null}
          </View>
          <AppSelect
            label="Day"
            value={scheduleItem.day}
            onSelect={day => updateSchedule(scheduleItem.id, {day})}
            options={classScheduleDays}
            placeholder="Tuesday"
          />
          <View
            style={[
              styles.timeRow,
              shouldStackTimeFields && styles.timeRowStacked,
            ]}>
            <AppSelect
              label="Start time"
              value={scheduleItem.startTime}
              onSelect={startTime =>
                updateSchedule(scheduleItem.id, {startTime})
              }
              options={classScheduleTimeSlots}
              placeholder="9:00 AM"
              style={styles.timeInput}
            />
            <AppSelect
              label="End time"
              value={scheduleItem.endTime}
              onSelect={endTime =>
                updateSchedule(scheduleItem.id, {endTime})
              }
              options={classScheduleTimeSlots}
              placeholder="10:30 AM"
              style={styles.timeInput}
            />
          </View>
        </View>
      ))}
      <AppButton mode="outlined" onPress={addSchedule}>
        Add Schedule
      </AppButton>
      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>
      <View
        style={[
          styles.actionRow,
          shouldStackTimeFields && styles.actionRowStacked,
        ]}>
        <AppButton
          mode="outlined"
          fullWidth={false}
          style={[styles.actionButton, shouldStackTimeFields && styles.stackedButton]}
          onPress={() => {
            setError('');
            setCurrentStep(0);
          }}>
          Back
        </AppButton>
        <AppButton
          fullWidth={false}
          style={[styles.actionButton, shouldStackTimeFields && styles.stackedButton]}
          onPress={goToReview}>
          Review Class
        </AppButton>
      </View>
    </>
  );

  const renderSummaryRow = (label: string, value: string) => (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );

  const renderReviewStep = () => (
    <>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Class Information</Text>
        {renderSummaryRow('Class name', className)}
        {renderSummaryRow('Subject', subject)}
        {renderSummaryRow('Grade level', gradeLevel)}
        {renderSummaryRow('Section', section)}
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Schedule</Text>
        {schedules.map((scheduleItem, index) => (
          <View key={scheduleItem.id} style={styles.scheduleSummaryRow}>
            <View style={styles.scheduleSummaryBadge}>
              <Text style={styles.scheduleSummaryNumber}>{index + 1}</Text>
            </View>
            <View style={styles.scheduleSummaryText}>
              <Text style={styles.scheduleSummaryDay}>{scheduleItem.day}</Text>
              <Text style={styles.scheduleSummaryTime}>
                {scheduleItem.startTime} to {scheduleItem.endTime}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>
      <View
        style={[
          styles.actionRow,
          shouldStackTimeFields && styles.actionRowStacked,
        ]}>
        <AppButton
          mode="outlined"
          fullWidth={false}
          style={[styles.actionButton, shouldStackTimeFields && styles.stackedButton]}
          disabled={saving}
          onPress={() => {
            setError('');
            setCurrentStep(1);
          }}>
          Back
        </AppButton>
        <AppButton
          fullWidth={false}
          style={[styles.actionButton, shouldStackTimeFields && styles.stackedButton]}
          loading={saving}
          disabled={saving}
          onPress={save}>
          Save Class
        </AppButton>
      </View>
    </>
  );

  return (
    <Screen>
      <AppHeader
        title="Create Class"
        subtitle={stepSubtitles[currentStep]}
      />
      {renderStepIndicator()}
      {currentStep === 0 ? renderDetailsStep() : null}
      {currentStep === 1 ? renderScheduleStep() : null}
      {currentStep === 2 ? renderReviewStep() : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionRowStacked: {
    flexDirection: 'column',
    gap: 0,
  },
  pressed: {
    opacity: 0.78,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  scheduleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scheduleTitle: {
    color: '#081638',
    fontSize: 17,
    fontWeight: '900',
  },
  scheduleHint: {
    color: '#3B4968',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 8,
  },
  scheduleSummaryBadge: {
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 14,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  scheduleSummaryDay: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '900',
  },
  scheduleSummaryNumber: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },
  scheduleSummaryRow: {
    alignItems: 'center',
    borderTopColor: '#EEF2F7',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  scheduleSummaryText: {
    flex: 1,
  },
  scheduleSummaryTime: {
    color: '#52617E',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: '#EEF2F7',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    marginBottom: 8,
    width: 30,
  },
  stepBadgeActive: {
    backgroundColor: '#2563EB',
  },
  stepBadgeComplete: {
    backgroundColor: '#16A34A',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepLabel: {
    color: '#8A94A8',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#081638',
  },
  stepLabelComplete: {
    color: '#166534',
  },
  stepNumber: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '900',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepper: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  stackedButton: {
    flex: 0,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF2F7',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  summaryLabel: {
    color: '#52617E',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryRow: {
    borderTopColor: '#EEF2F7',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  summaryTitle: {
    color: '#081638',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  summaryValue: {
    color: '#081638',
    flex: 1.2,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  timeInput: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeRowStacked: {
    flexDirection: 'column',
    gap: 0,
  },
});
