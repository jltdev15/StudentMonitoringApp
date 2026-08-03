// @refresh reset
import React, {useEffect, useState} from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import {HelperText, Portal, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {EmptyState} from '../../components/EmptyState';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {updateStudentProfile} from '../../services/studentService';
import {StudentStackParamList} from '../../types/navigation';

type Props = NativeStackScreenProps<
  StudentStackParamList,
  'EditStudentProfile'
>;

const genderOptions = ['Female', 'Male', 'Prefer not to say'];

const toPickerDate = (value: string) => {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(2010, 0, 1) : parsed;
};

const toBirthdayValue = (value: Date) => value.toISOString().slice(0, 10);

export const EditStudentProfileScreen = ({navigation}: Props) => {
  const {student, refreshProfile} = useAuth();
  const [phone, setPhone] = useState(student?.contactNumber || '');
  const [birthday, setBirthday] = useState(student?.dateOfBirth || '');
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [gender, setGender] = useState(student?.gender || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSucceeded, setSaveSucceeded] = useState(false);

  useEffect(() => {
    if (!saveSucceeded) {
      return;
    }

    const timeout = setTimeout(() => {
      setSaveSucceeded(false);
      navigation.goBack();
    }, 1400);

    return () => clearTimeout(timeout);
  }, [navigation, saveSucceeded]);

  const openBirthdayPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        maximumDate: new Date(),
        mode: 'date',
        onValueChange: (_event, selectedDate) => {
          setBirthday(toBirthdayValue(selectedDate));
        },
        value: toPickerDate(birthday),
      });
      return;
    }

    setShowBirthdayPicker(true);
  };

  const save = async () => {
    if (!student || saving) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateStudentProfile(student.id, {
        contactNumber: phone.trim(),
        dateOfBirth: birthday.trim(),
        gender,
      });
      await refreshProfile();
      setSaveSucceeded(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'We could not save your profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!student) {
    return (
      <Screen>
        <AppHeader
          title="Edit Profile"
          subtitle="Update your personal information."
        />
        <EmptyState
          title="Student profile unavailable"
          message="Please return to your profile and try again."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Edit Profile"
        subtitle="Keep your personal contact details up to date."
      />

      <View style={styles.notice}>
        <View style={styles.noticeIcon}>
          <MaterialCommunityIcons
            color="#286BE8"
            name="shield-account-outline"
            size={22}
          />
        </View>
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>School-managed details</Text>
          <Text style={styles.noticeText}>
            Grade, section, school, and student number can only be updated by your school.
          </Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <MaterialCommunityIcons color="#286BE8" name="account-outline" size={20} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.sectionSubtitle}>Your contact and identity details</Text>
          </View>
        </View>
        <AppTextInput
          keyboardType="phone-pad"
          label="Phone"
          onChangeText={setPhone}
          placeholder="Enter your phone number"
          style={styles.field}
          inputStyle={styles.input}
          value={phone}
        />
        <Text style={styles.fieldLabel}>Birthday</Text>
        <Pressable
          accessibilityLabel="Choose birthday"
          accessibilityRole="button"
          onPress={openBirthdayPicker}
          style={({pressed}) => [
            styles.dateField,
            pressed && styles.pressed,
          ]}>
          <MaterialCommunityIcons
            color="#286BE8"
            name="calendar-outline"
            size={20}
          />
          <Text style={[styles.dateFieldValue, !birthday && styles.datePlaceholder]}>
            {birthday || 'Select your birthday'}
          </Text>
          <MaterialCommunityIcons
            color="#8291AC"
            name="chevron-down"
            size={20}
          />
        </Pressable>
        {showBirthdayPicker && Platform.OS === 'ios' ? (
          <View style={styles.pickerShell}>
            <DateTimePicker
              display="spinner"
              maximumDate={new Date()}
              mode="date"
              onDismiss={() => setShowBirthdayPicker(false)}
              onValueChange={(_event, selectedDate) =>
                setBirthday(toBirthdayValue(selectedDate))
              }
              value={toPickerDate(birthday)}
            />
            <Pressable
              accessibilityLabel="Done choosing birthday"
              accessibilityRole="button"
              onPress={() => setShowBirthdayPicker(false)}
              style={styles.pickerDoneButton}>
              <Text style={styles.pickerDoneText}>Done</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Gender</Text>
        <View style={styles.genderOptions}>
          {genderOptions.map(option => {
            const selected = gender === option;
            return (
              <Pressable
                accessibilityLabel={`Select ${option}`}
                accessibilityRole="radio"
                accessibilityState={{selected}}
                key={option}
                onPress={() => setGender(option)}
                style={({pressed}) => [
                  styles.genderOption,
                  selected && styles.genderOptionSelected,
                  pressed && styles.pressed,
                ]}>
                <View
                  style={[
                    styles.radio,
                    selected && styles.radioSelected,
                  ]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.genderOptionText,
                    selected && styles.genderOptionTextSelected,
                  ]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>
      <AppButton
        disabled={saving || saveSucceeded}
        icon="content-save-outline"
        loading={saving}
        onPress={save}>
        Save Changes
      </AppButton>
      <Text style={styles.saveHint}>Your changes will be visible on your profile right away.</Text>
      <Portal>
        {saveSucceeded ? (
          <View
          accessibilityLabel="Profile updated"
          style={styles.successToast}
            accessibilityRole="alert">
            <Text style={styles.successToastText}>
              Profile updated successfully.
            </Text>
          </View>
        ) : null}
      </Portal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dateField: {alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E1EAF7', borderRadius: 11, borderWidth: 1, flexDirection: 'row', marginBottom: 12, minHeight: 48, paddingHorizontal: 13},
  dateFieldValue: {color: '#152C5E', flex: 1, fontSize: 14, fontWeight: '700', marginLeft: 9},
  datePlaceholder: {color: '#8A94A8', fontWeight: '500'},
  field: {marginBottom: 12},
  fieldLabel: {color: '#152C5E', fontSize: 13, fontWeight: '900', marginBottom: 8},
  genderOption: {alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE8FA', borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 44, minWidth: 0, paddingHorizontal: 7},
  genderOptionSelected: {backgroundColor: '#EEF4FF', borderColor: '#286BE8'},
  genderOptionText: {color: '#536681', fontSize: 10, fontWeight: '800', marginLeft: 5},
  genderOptionTextSelected: {color: '#1F5FD8'},
  genderOptions: {flexDirection: 'row', gap: 7, marginBottom: 2},
  input: {borderColor: '#E1EAF7', borderRadius: 11, elevation: 0, fontSize: 14, minHeight: 48, shadowOpacity: 0},
  notice: {alignItems: 'center', backgroundColor: '#EFF5FF', borderColor: '#D7E5FE', borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 16, padding: 13},
  noticeCopy: {flex: 1, marginLeft: 10},
  noticeIcon: {alignItems: 'center', backgroundColor: '#DCEAFF', borderRadius: 11, height: 42, justifyContent: 'center', width: 42},
  noticeText: {color: '#617391', fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 2},
  noticeTitle: {color: '#1E4FAD', fontSize: 13, fontWeight: '900'},
  pickerDoneButton: {alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8},
  pickerDoneText: {color: '#286BE8', fontSize: 14, fontWeight: '900'},
  pickerShell: {backgroundColor: '#F7FAFF', borderColor: '#E1EAF7', borderRadius: 11, borderWidth: 1, marginBottom: 12, overflow: 'hidden'},
  pressed: {opacity: 0.76},
  radio: {alignItems: 'center', borderColor: '#91A1BD', borderRadius: 9, borderWidth: 1.5, height: 18, justifyContent: 'center', width: 18},
  radioDot: {backgroundColor: '#286BE8', borderRadius: 5, height: 9, width: 9},
  radioSelected: {borderColor: '#286BE8'},
  saveHint: {color: '#7A8AA7', fontSize: 12, fontWeight: '600', marginTop: 10, textAlign: 'center'},
  sectionCard: {backgroundColor: '#FFFFFF', borderColor: '#E6EDF8', borderRadius: 15, borderWidth: 1, elevation: 2, marginBottom: 14, padding: 14, shadowColor: '#7183A1', shadowOffset: {height: 4, width: 0}, shadowOpacity: 0.06, shadowRadius: 9},
  sectionHeader: {alignItems: 'center', flexDirection: 'row', marginBottom: 15},
  sectionIcon: {alignItems: 'center', backgroundColor: '#EEF4FF', borderRadius: 11, height: 42, justifyContent: 'center', marginRight: 10, width: 42},
  sectionSubtitle: {color: '#7483A0', fontSize: 11, fontWeight: '600', marginTop: 2},
  sectionTitle: {color: '#102653', fontSize: 16, fontWeight: '900'},
  successToast: {alignSelf: 'center', backgroundColor: '#176C3D', borderRadius: 12, bottom: 26, elevation: 7, left: 20, paddingHorizontal: 18, paddingVertical: 14, position: 'absolute', right: 20, shadowColor: '#0E4B29', shadowOffset: {height: 5, width: 0}, shadowOpacity: 0.24, shadowRadius: 10},
  successToastText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700', textAlign: 'center'},
});
