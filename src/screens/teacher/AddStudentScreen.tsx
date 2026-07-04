import React, {useCallback, useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {HelperText, Menu, Button} from 'react-native-paper';
import {AppButton} from '../../components/AppButton';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {getTeacherClasses} from '../../services/classService';
import {createStudent} from '../../services/studentService';
import {ClassRecord} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';
import {required} from '../../utils/validationUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'AddStudent'>;

export const AddStudentScreen = ({route, navigation}: Props) => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState(route.params?.classId || '');
  const [menuVisible, setMenuVisible] = useState(false);
  const [studentNumber, setStudentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [guardianName] = useState('');
  const [guardianContact] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (profile) {
      setClasses(await getTeacherClasses(profile.uid));
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedClass = classes.find(item => item.id === classId);

  const save = async () => {
    const validation =
      required(studentNumber, 'Student number') ||
      required(fullName, 'Full name') ||
      required(classId, 'Class');
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    await createStudent({
      userId: null,
      studentNumber,
      fullName,
      email,
      contactNumber,
      guardianName,
      guardianContact,
      classIds: [classId],
    });
    setSaving(false);
    navigation.goBack();
  };

  return (
    <Screen>
      <AppHeader
        title="Add Student"
        subtitle="Create a student profile and assign it to a class."
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
            title={`${item.className} · ${item.section}`}
            onPress={() => {
              setClassId(item.id);
              setMenuVisible(false);
            }}
          />
        ))}
      </Menu>
      <AppTextInput
        label="Student number"
        value={studentNumber}
        onChangeText={setStudentNumber}
      />
      <AppTextInput
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <AppTextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <AppTextInput
        label="Contact number"
        value={contactNumber}
        onChangeText={setContactNumber}
        keyboardType="phone-pad"
      />
      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>
      <AppButton loading={saving} onPress={save}>
        Save Student
      </AppButton>
    </Screen>
  );
};
