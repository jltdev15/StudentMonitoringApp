import React, {useCallback, useEffect, useState} from 'react';
import {Alert, Pressable, StyleSheet, View} from 'react-native';
import {HelperText, Menu, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {createAnnouncement} from '../../services/announcementService';
import {getTeacherClasses} from '../../services/classService';
import {ClassRecord} from '../../types/models';
import {required} from '../../utils/validationUtils';

export const AnnouncementsScreen = () => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadClasses = useCallback(async () => {
    if (!profile) {
      return;
    }

    try {
      setClasses(await getTeacherClasses(profile.uid));
    } catch {
      setError('We could not load your classes. Please try again.');
    }
  }, [profile]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const selectedClass = classes.find(item => item.id === classId);

  const save = async () => {
    const validation = required(title, 'Title') || required(message, 'Message');
    if (validation || !profile) {
      setError(validation || 'Teacher account not loaded.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await createAnnouncement({
        classId,
        title: title.trim(),
        message: message.trim(),
        postedBy: profile.uid,
        targetRole: 'students',
      });
      setTitle('');
      setMessage('');
      Alert.alert(
        'Announcement posted',
        selectedClass
          ? `Students in ${selectedClass.className} will be notified.`
          : 'All students will be notified.',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to post the announcement. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Announcements"
        subtitle="Send updates directly to your students."
      />
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Recipients</Text>
        <Text style={styles.sectionSubtitle}>
          Choose everyone or send to one class.
        </Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Pressable
              accessibilityLabel="Select announcement recipients"
              accessibilityRole="button"
              onPress={() => setMenuVisible(true)}
              style={({pressed}) => [
                styles.selector,
                pressed && styles.pressed,
              ]}>
              <View style={styles.selectorIcon}>
                <MaterialCommunityIcons
                  name={selectedClass ? 'school-outline' : 'account-group-outline'}
                  size={24}
                  color="#2563EB"
                />
              </View>
              <View style={styles.selectorCopy}>
                <Text style={styles.selectorLabel}>Send to</Text>
                <Text numberOfLines={1} style={styles.selectorTitle}>
                  {selectedClass ? selectedClass.className : 'All students'}
                </Text>
                <Text numberOfLines={1} style={styles.selectorMeta}>
                  {selectedClass
                    ? `${selectedClass.subject} · ${selectedClass.gradeLevel} · ${selectedClass.section}`
                    : 'Every active student account'}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-down"
                size={24}
                color="#52617E"
              />
            </Pressable>
          }>
          <Menu.Item
            leadingIcon="account-group-outline"
            onPress={() => {
              setClassId(null);
              setMenuVisible(false);
            }}
            title="All students"
          />
          {classes.map(item => (
            <Menu.Item
              key={item.id}
              leadingIcon="school-outline"
              onPress={() => {
                setClassId(item.id);
                setMenuVisible(false);
              }}
              title={`${item.className} · ${item.section}`}
            />
          ))}
        </Menu>
      </View>
      <View style={styles.composerHeading}>
        <Text style={styles.sectionTitle}>Announcement</Text>
        <Text style={styles.sectionSubtitle}>
          Keep the title clear and the message easy to scan.
        </Text>
      </View>
      <AppTextInput
        label="Title"
        placeholder="Example: Class schedule update"
        value={title}
        onChangeText={setTitle}
      />
      <AppTextInput
        label="Message"
        multiline
        numberOfLines={5}
        placeholder="Write the update your students need to see."
        inputStyle={styles.messageInput}
        value={message}
        onChangeText={setMessage}
      />
      <HelperText type="error" visible={Boolean(error)}>
        {error}
      </HelperText>
      <AppButton
        disabled={saving || !title.trim() || !message.trim()}
        icon="send-outline"
        loading={saving}
        onPress={save}>
        Post Announcement
      </AppButton>
    </Screen>
  );
};

const styles = StyleSheet.create({
  composerHeading: {
    marginTop: 4,
  },
  messageInput: {
    minHeight: 132,
    paddingTop: 15,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.82,
  },
  sectionBlock: {
    marginBottom: 20,
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
  selector: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 14,
  },
  selectorCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectorIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  selectorLabel: {
    color: '#52617E',
    fontSize: 12,
    fontWeight: '800',
  },
  selectorMeta: {
    color: '#52617E',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  selectorTitle: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 1,
  },
});
