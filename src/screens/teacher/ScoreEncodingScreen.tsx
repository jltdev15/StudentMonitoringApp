import React, {useCallback, useEffect, useState} from 'react';
import {Image, Modal, Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Text} from 'react-native-paper';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {AppTextInput} from '../../components/AppTextInput';
import {StatusBadge} from '../../components/StatusBadge';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {
  getSubmissionsByActivity,
  saveSubmissionBatch,
} from '../../services/activityService';
import {getStudentsByClass} from '../../services/studentService';
import {
  ActivitySubmissionStatus,
  StudentRecord,
  SubmissionDraft,
} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';
import {submissionStatuses} from '../../utils/constants';

type Props = NativeStackScreenProps<TeacherStackParamList, 'ScoreEncoding'>;

export const ScoreEncodingScreen = ({route}: Props) => {
  const {profile} = useAuth();
  const {activity} = route.params;
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SubmissionDraft>>({});
  const [submissionsByStudent, setSubmissionsByStudent] = useState<
    Record<string, import('../../types/models').ActivitySubmissionRecord>
  >({});
  const [saving, setSaving] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');

  const load = useCallback(async () => {
    const [nextStudents, submissions] = await Promise.all([
      getStudentsByClass(activity.classId),
      getSubmissionsByActivity(activity.id),
    ]);
    const submissionByStudent = Object.fromEntries(
      submissions.map(item => [item.studentId, item]),
    );
    const sortedStudents = [...nextStudents].sort((first, second) =>
      first.fullName.localeCompare(second.fullName, undefined, {
        sensitivity: 'base',
      }),
    );
    setSubmissionsByStudent(submissionByStudent);
    setStudents(sortedStudents);
    setDrafts(
      Object.fromEntries(
        sortedStudents.map(student => [
          student.id,
          {
            studentId: student.id,
            status: (submissionByStudent[student.id]?.status ||
              'missing') as ActivitySubmissionStatus,
            score: submissionByStudent[student.id]?.score ?? null,
            remarks: submissionByStudent[student.id]?.remarks || '',
          },
        ]),
      ),
    );
  }, [activity.classId, activity.id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateDraft = (
    studentId: string,
    changes: Partial<SubmissionDraft>,
  ) => {
    setDrafts(current => ({
      ...current,
      [studentId]: {...current[studentId], ...changes, studentId},
    }));
  };

  const save = async () => {
    if (!profile) {
      return;
    }
    setSaving(true);
    await saveSubmissionBatch(activity, profile.uid, Object.values(drafts));
    setSaving(false);
  };

  return (
    <Screen>
      <AppHeader
        title="Score Encoding"
        subtitle={`${activity.title} · ${activity.totalPoints} pts`}
      />
      {students.map(student => {
        const draft = drafts[student.id];
        return (
          <AppCard key={student.id}>
            <Text variant="titleMedium" style={styles.name}>
              {student.fullName}
            </Text>
            <View style={styles.row}>
              {submissionStatuses.map(status => (
                <Button
                  key={status}
                  compact
                  mode={draft?.status === status ? 'contained' : 'outlined'}
                  onPress={() => updateDraft(student.id, {status})}>
                  {status}
                </Button>
              ))}
            </View>
            {draft?.status ? <StatusBadge status={draft.status} /> : null}
            {submissionsByStudent[student.id]?.attachments?.length ? (
              <View style={styles.attachments}>
                <Text style={styles.attachmentsLabel}>Submitted Images</Text>
                <View style={styles.thumbnailRow}>
                  {submissionsByStudent[student.id].attachments?.map(
                    attachment => (
                      <Pressable
                        key={attachment.id}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${attachment.fileName}`}
                        onPress={() =>
                          setSelectedImageUrl(attachment.downloadUrl)
                        }>
                        <Image
                          source={{uri: attachment.downloadUrl}}
                          style={styles.thumbnail}
                        />
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            ) : null}
            <AppTextInput
              label="Score"
              value={draft?.score == null ? '' : String(draft.score)}
              onChangeText={score =>
                updateDraft(student.id, {score: score ? Number(score) : null})
              }
              keyboardType="numeric"
            />
            <AppTextInput
              label="Remarks"
              value={draft?.remarks || ''}
              onChangeText={remarks => updateDraft(student.id, {remarks})}
            />
          </AppCard>
        );
      })}
      <AppButton loading={saving} onPress={save}>
        Save Scores
      </AppButton>
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(selectedImageUrl)}
        onRequestClose={() => setSelectedImageUrl('')}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close image viewer"
          onPress={() => setSelectedImageUrl('')}
          style={styles.imageModal}>
          {selectedImageUrl ? (
            <Image
              source={{uri: selectedImageUrl}}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  attachments: {marginTop: 12},
  attachmentsLabel: {
    color: '#52617E',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  fullImage: {height: '88%', width: '92%'},
  imageModal: {
    alignItems: 'center',
    backgroundColor: 'rgba(3, 12, 41, 0.92)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  name: {fontWeight: '800', marginBottom: 8},
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8},
  thumbnail: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    height: 64,
    width: 64,
  },
  thumbnailRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8},
});
