import React, {useState} from 'react';
import {Alert, Pressable, StyleSheet, Switch, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Timestamp} from '@react-native-firebase/firestore';
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {HelperText, Text} from 'react-native-paper';
import {AppButton} from '../../components/AppButton';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {Screen} from '../../components/Screen';
import {updateActivity} from '../../services/activityService';
import {ActivityRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';
import {required, toNumberOrZero} from '../../utils/validationUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'EditActivity'>;

const toPickerDate = (dueDate: ActivityRecord['dueDate']) => {
  if (!dueDate) {
    return new Date();
  }
  return 'toDate' in dueDate ? dueDate.toDate() : dueDate;
};

export const EditActivityScreen = ({route, navigation}: Props) => {
  const {activity} = route.params;
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description);
  const [dueDate, setDueDate] = useState(() => toPickerDate(activity.dueDate));
  const [totalPoints, setTotalPoints] = useState(String(activity.totalPoints));
  const [acceptsImageAttachments, setAcceptsImageAttachments] = useState(
    activity.acceptsImageAttachments === true,
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const readableDueDate = dueDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const onDueDateChange = (
    _event: DateTimePickerChangeEvent,
    selectedDate: Date,
  ) => setDueDate(selectedDate);

  const save = async () => {
    const validation = required(title, 'Activity title');
    if (validation) {
      setError(validation);
      return;
    }
    if (activity.status !== 'active') {
      setError('Closed activities cannot be edited.');
      return;
    }

    const updatedActivity: ActivityRecord = {
      ...activity,
      title,
      description,
      dueDate: Timestamp.fromDate(dueDate),
      totalPoints: toNumberOrZero(totalPoints),
      acceptsImageAttachments,
    };
    setError('');
    setSaving(true);
    try {
      await updateActivity(activity.id, {
        title: updatedActivity.title,
        description: updatedActivity.description,
        dueDate: updatedActivity.dueDate,
        totalPoints: updatedActivity.totalPoints,
        acceptsImageAttachments: updatedActivity.acceptsImageAttachments,
      });
      Alert.alert('Activity updated', 'Your changes have been saved.', [
        {
          text: 'View Activity',
          onPress: () =>
            navigation.replace('ActivityDetails', {activity: updatedActivity}),
        },
      ]);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update the activity. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Edit Activity"
        subtitle="Update the activity details and deadline."
      />
      <AppTextInput
        label="Activity title"
        placeholder="Example: Chapter 3 Quiz"
        value={title}
        onChangeText={setTitle}
      />
      <View style={styles.attachmentOption}>
        <View style={styles.attachmentIcon}>
          <MaterialCommunityIcons name="image-plus" size={23} color="#2563EB" />
        </View>
        <View style={styles.attachmentCopy}>
          <Text style={styles.attachmentTitle}>Accept image submissions</Text>
          <Text style={styles.attachmentSubtitle}>
            Students can take photos or choose images of their work.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Accept image submissions"
          onValueChange={setAcceptsImageAttachments}
          thumbColor="#FFFFFF"
          trackColor={{false: '#CBD5E1', true: '#2563EB'}}
          value={acceptsImageAttachments}
        />
      </View>
      <AppTextInput
        label="Description"
        placeholder="Example: Complete the quiz before Friday."
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <View style={styles.dateField}>
        <Text style={styles.dateLabel}>Due date</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select due date"
          onPress={() => setDatePickerVisible(true)}
          style={({pressed}) => [
            styles.dateSelector,
            pressed && styles.pressed,
          ]}>
          <View style={styles.dateIcon}>
            <MaterialCommunityIcons
              name="calendar-outline"
              size={23}
              color="#2563EB"
            />
          </View>
          <View style={styles.dateCopy}>
            <Text style={styles.dateValue}>{readableDueDate}</Text>
            <Text style={styles.dateHint}>Choose the activity deadline.</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color="#52617E"
          />
        </Pressable>
        {datePickerVisible ? (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onValueChange={onDueDateChange}
            onDismiss={() => setDatePickerVisible(false)}
          />
        ) : null}
      </View>
      <AppTextInput
        label="Total points"
        placeholder="Example: 100"
        value={totalPoints}
        onChangeText={setTotalPoints}
        keyboardType="numeric"
      />
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
  attachmentCopy: {flex: 1, minWidth: 0},
  attachmentIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  attachmentOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    minHeight: 80,
    padding: 14,
  },
  attachmentSubtitle: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 3,
  },
  attachmentTitle: {color: '#081638', fontSize: 15, fontWeight: '900'},
  dateCopy: {
    flex: 1,
    minWidth: 0,
  },
  dateField: {
    marginBottom: 8,
  },
  dateHint: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  dateIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  dateLabel: {
    color: '#081638',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  dateSelector: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    padding: 14,
  },
  dateValue: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
