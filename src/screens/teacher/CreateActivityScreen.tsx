import React, {useCallback, useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, HelperText, Menu} from 'react-native-paper';
import {Timestamp} from '@react-native-firebase/firestore';
import {AppButton} from '../../components/AppButton';
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
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalPoints, setTotalPoints] = useState('100');
  const [menuVisible, setMenuVisible] = useState(false);
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

  const save = async () => {
    const validation =
      required(classId, 'Class') || required(title, 'Activity title');
    if (validation || !profile) {
      setError(validation || 'Teacher account not loaded.');
      return;
    }
    setSaving(true);
    await createActivity({
      classId,
      title,
      description,
      dueDate: Timestamp.fromDate(new Date(dueDate)),
      totalPoints: toNumberOrZero(totalPoints),
      createdBy: profile.uid,
    });
    setSaving(false);
    navigation.goBack();
  };

  return (
    <Screen>
      <AppHeader
        title="Create Activity"
        subtitle="Assign work and set the scoring total."
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
        label="Activity title"
        value={title}
        onChangeText={setTitle}
      />
      <AppTextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <AppTextInput
        label="Due date (YYYY-MM-DD)"
        value={dueDate}
        onChangeText={setDueDate}
      />
      <AppTextInput
        label="Total points"
        value={totalPoints}
        onChangeText={setTotalPoints}
        keyboardType="numeric"
      />
      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>
      <AppButton loading={saving} onPress={save}>
        Save Activity
      </AppButton>
    </Screen>
  );
};
