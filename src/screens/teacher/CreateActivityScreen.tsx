import React, {useCallback, useEffect, useState} from 'react';
import {Alert, Pressable, StyleSheet, Switch, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {HelperText, Menu, Text} from 'react-native-paper';
import {Timestamp} from '@react-native-firebase/firestore';
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {EmptyState} from '../../components/EmptyState';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {createActivity} from '../../services/activityService';
import {getTeacherClasses} from '../../services/classService';
import {ClassRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';
import {required, toNumberOrZero} from '../../utils/validationUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'CreateActivity'>;

export const CreateActivityScreen = ({route, navigation}: Props) => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState(route.params?.classId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [totalPoints, setTotalPoints] = useState('100');
  const [acceptsImageAttachments, setAcceptsImageAttachments] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (profile) {
      const nextClasses = await getTeacherClasses(profile.uid);
      setClasses(nextClasses);
      if (!classId && nextClasses[0]) {
        setClassId(nextClasses[0].id);
      }
    }
  }, [classId, profile]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedClass = classes.find(item => item.id === classId);
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
    const validation =
      required(classId, 'Class') || required(title, 'Activity title');
    if (validation || !profile) {
      setError(validation || 'Teacher account not loaded.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await createActivity({
        classId,
        title,
        description,
        dueDate: Timestamp.fromDate(dueDate),
        totalPoints: toNumberOrZero(totalPoints),
        createdBy: profile.uid,
        acceptsImageAttachments,
      });
      Alert.alert(
        'Activity saved',
        `${title || 'Your activity'} is now available for ${
          selectedClass?.className || 'the selected class'
        }.`,
        [
          {text: 'Stay here', style: 'cancel'},
          {
            text: 'View Activities',
            onPress: () => navigation.navigate('ActivityList', {classId}),
          },
        ],
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save the activity. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const renderClassSelector = () => (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>Class</Text>
      <Text style={styles.sectionSubtitle}>
        Choose where this activity will be assigned.
      </Text>
      {classes.length ? (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuVisible(true)}
              style={({pressed}) => [
                styles.selectorCard,
                pressed && styles.pressed,
              ]}>
              <View style={styles.selectorIcon}>
                <MaterialCommunityIcons
                  name="school-outline"
                  size={24}
                  color="#2563EB"
                />
              </View>
              <View style={styles.selectorCopy}>
                <Text style={styles.selectorLabel}>Selected class</Text>
                <Text numberOfLines={1} style={styles.selectorTitle}>
                  {selectedClass ? selectedClass.className : 'Select class'}
                </Text>
                <Text numberOfLines={1} style={styles.selectorMeta}>
                  {selectedClass
                    ? `${selectedClass.subject} · ${selectedClass.section}`
                    : 'Choose a class for this activity'}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-down"
                size={24}
                color="#52617E"
              />
            </Pressable>
          }>
          {classes.map(item => (
            <Menu.Item
              key={item.id}
              title={`${item.className} · ${item.section}`}
              onPress={() => {
                setClassId(item.id);
                setMenuVisible(false);
              }}
            />
          ))}
        </Menu>
      ) : (
        <EmptyState
          title="Create a class first"
          message="A class is required before creating an activity."
        />
      )}
    </View>
  );

  return (
    <Screen>
      <AppHeader
        title="Create Activity"
        subtitle="Assign work and set the scoring total."
      />
      {renderClassSelector()}
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
      <AppButton loading={saving} disabled={!classes.length} onPress={save}>
        Save Activity
      </AppButton>
    </Screen>
  );
};

const styles = StyleSheet.create({
  attachmentCopy: {
    flex: 1,
    minWidth: 0,
  },
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
  attachmentTitle: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '900',
  },
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
  sectionBlock: {
    marginBottom: 18,
  },
  sectionSubtitle: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
  selectorCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  selectorCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectorIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  selectorLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  selectorMeta: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  selectorTitle: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
});
