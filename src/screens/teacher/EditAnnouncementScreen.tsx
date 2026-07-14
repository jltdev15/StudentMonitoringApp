import React, {useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {HelperText, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {Screen} from '../../components/Screen';
import {updateAnnouncement} from '../../services/announcementService';
import {TeacherStackParamList} from '../../types/navigation';
import {required} from '../../utils/validationUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'EditAnnouncement'>;

export const EditAnnouncementScreen = ({route, navigation}: Props) => {
  const {announcement} = route.params;
  const [title, setTitle] = useState(announcement.title);
  const [message, setMessage] = useState(announcement.message);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isClassAnnouncement = Boolean(announcement.classId);

  const save = async () => {
    const validation = required(title, 'Title') || required(message, 'Message');
    if (validation) {
      setError(validation);
      return;
    }

    setError('');
    setSaving(true);
    try {
      await updateAnnouncement(announcement.id, {
        message: message.trim(),
        title: title.trim(),
      });
      Alert.alert('Announcement updated', 'Your changes are now visible in the app.', [
        {text: 'Done', onPress: () => navigation.goBack()},
      ]);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update the announcement. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Edit Announcement"
        subtitle="Update the message without sending another alert."
      />
      <View style={styles.audienceField}>
        <View style={styles.audienceIcon}>
          <MaterialCommunityIcons
            name={isClassAnnouncement ? 'school-outline' : 'account-group-outline'}
            size={23}
            color="#2563EB"
          />
        </View>
        <View style={styles.audienceCopy}>
          <Text style={styles.audienceLabel}>Original recipients</Text>
          <Text style={styles.audienceValue}>
            {isClassAnnouncement ? 'Selected class' : 'All students'}
          </Text>
        </View>
        <MaterialCommunityIcons name="lock-outline" size={21} color="#71809B" />
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
        icon="content-save-outline"
        loading={saving}
        onPress={save}>
        Save Changes
      </AppButton>
    </Screen>
  );
};

const styles = StyleSheet.create({
  audienceCopy: {
    flex: 1,
    minWidth: 0,
  },
  audienceField: {
    alignItems: 'center',
    backgroundColor: '#F8FAFE',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    minHeight: 76,
    padding: 14,
  },
  audienceIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  audienceLabel: {
    color: '#52617E',
    fontSize: 12,
    fontWeight: '800',
  },
  audienceValue: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  messageInput: {
    minHeight: 132,
    paddingTop: 15,
    textAlignVertical: 'top',
  },
});
