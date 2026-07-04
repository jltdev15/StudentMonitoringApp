import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Button, HelperText, Menu, Text} from 'react-native-paper';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {
  createAnnouncement,
  getTeacherAnnouncements,
} from '../../services/announcementService';
import {getTeacherClasses} from '../../services/classService';
import {AnnouncementRecord, ClassRecord} from '../../types/models';
import {required} from '../../utils/validationUtils';

export const AnnouncementsScreen = () => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (profile) {
      setClasses(await getTeacherClasses(profile.uid));
      setAnnouncements(await getTeacherAnnouncements(profile.uid));
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedClass = classes.find(item => item.id === classId);

  const save = async () => {
    const validation = required(title, 'Title') || required(message, 'Message');
    if (validation || !profile) {
      setError(validation || 'Teacher account not loaded.');
      return;
    }
    await createAnnouncement({
      classId,
      title,
      message,
      postedBy: profile.uid,
      targetRole: 'students',
    });
    setTitle('');
    setMessage('');
    setError('');
    await load();
  };

  return (
    <Screen>
      <AppHeader title="Announcements" subtitle="Post updates for students." />
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setMenuVisible(true)}>
            {selectedClass ? selectedClass.className : 'All classes'}
          </Button>
        }>
        <Menu.Item
          title="All classes"
          onPress={() => {
            setClassId(null);
            setMenuVisible(false);
          }}
        />
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
      <AppTextInput label="Title" value={title} onChangeText={setTitle} />
      <AppTextInput
        label="Message"
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>
      <AppButton onPress={save}>Post Announcement</AppButton>
      {announcements.map(item => (
        <AppCard key={item.id}>
          <Text variant="titleMedium" style={styles.title}>
            {item.title}
          </Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.meta}>
            {item.classId ? 'Class announcement' : 'General announcement'}
          </Text>
        </AppCard>
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  message: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 8,
  },
  meta: {
    color: '#3B4968',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  title: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
  },
});
