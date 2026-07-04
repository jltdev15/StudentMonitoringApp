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
import {updateClass} from '../../services/classService';
import {TeacherStackParamList} from '../../types/navigation';
import {
  ScheduleEntry,
  classScheduleDays,
  classScheduleTimeSlots,
  emptyScheduleEntry,
  parseScheduleEntries,
  serializeScheduleEntries,
} from '../../utils/classScheduleUtils';
import {required} from '../../utils/validationUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'EditClass'>;

type ScheduleRow = ScheduleEntry & {
  id: string;
};

let scheduleRowId = 0;

const createScheduleRow = (
  entry: ScheduleEntry = emptyScheduleEntry(),
): ScheduleRow => ({
  ...entry,
  id: `edit-schedule-${scheduleRowId++}`,
});

export const EditClassScreen = ({route, navigation}: Props) => {
  const {classItem} = route.params;
  const {width} = useWindowDimensions();
  const [className, setClassName] = useState(classItem.className);
  const [subject, setSubject] = useState(classItem.subject);
  const [gradeLevel, setGradeLevel] = useState(classItem.gradeLevel);
  const [section, setSection] = useState(classItem.section);
  const [schedules, setSchedules] = useState<ScheduleRow[]>(
    parseScheduleEntries(classItem.schedule).map(createScheduleRow),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const shouldStackTimeFields = width < 420;

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
    const validation =
      required(className, 'Class name') ||
      required(subject, 'Subject') ||
      required(gradeLevel, 'Grade level') ||
      required(section, 'Section');
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    await updateClass(classItem.id, {
      className,
      subject,
      gradeLevel,
      section,
      schedule: serializeScheduleEntries(
        schedules.map(({id: _id, ...entry}) => entry),
      ),
    });
    setSaving(false);
    navigation.goBack();
  };

  return (
    <Screen>
      <AppHeader
        title="Edit Class"
        subtitle="Update class details, section, and schedule."
      />
      <AppTextInput
        label="Class name"
        value={className}
        onChangeText={setClassName}
      />
      <AppTextInput label="Subject" value={subject} onChangeText={setSubject} />
      <AppTextInput
        label="Grade level"
        value={gradeLevel}
        onChangeText={setGradeLevel}
      />
      <AppTextInput label="Section" value={section} onChangeText={setSection} />
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
      <AppButton loading={saving} onPress={save}>
        Save Changes
      </AppButton>
    </Screen>
  );
};

const styles = StyleSheet.create({
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
