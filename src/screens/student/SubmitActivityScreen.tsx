import React, {useCallback, useEffect, useState} from 'react';
import {Alert, Image, Pressable, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  Asset,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {useAuth} from '../../context/AuthContext';
import {
  getActivitySubmission,
  MAX_SUBMISSION_IMAGES,
  SubmissionImage,
  submitImageActivity,
} from '../../services/activityService';
import {ActivitySubmissionRecord} from '../../types/models';
import {StudentStackParamList} from '../../types/navigation';
import {ensureCameraPermission} from '../../utils/cameraPermission';

type Props = NativeStackScreenProps<StudentStackParamList, 'SubmitActivity'>;

const toSubmissionImage = (asset: Asset): SubmissionImage | null => {
  if (!asset.uri || !asset.type?.startsWith('image/')) {
    return null;
  }
  return {
    uri: asset.uri,
    fileName: asset.fileName || `activity-image-${Date.now()}.jpg`,
    contentType: asset.type,
    fileSize: asset.fileSize,
  };
};

export const SubmitActivityScreen = ({route, navigation}: Props) => {
  const {activity} = route.params;
  const {profile, student} = useAuth();
  const [images, setImages] = useState<SubmissionImage[]>([]);
  const [existingSubmission, setExistingSubmission] =
    useState<ActivitySubmissionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState('');
  const studentId = profile?.studentId || student?.id;
  const submissionLocked = typeof existingSubmission?.score === 'number';

  const loadSubmission = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setExistingSubmission(
        await getActivitySubmission(activity.id, studentId),
      );
    } catch {
      setError('We could not load your existing submission.');
    } finally {
      setLoading(false);
    }
  }, [activity.id, studentId]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const addAssets = (assets?: Asset[]) => {
    const nextImages = (assets || [])
      .map(toSubmissionImage)
      .filter((image): image is SubmissionImage => Boolean(image));
    if (!nextImages.length) {
      return;
    }
    setImages(current => {
      const available = MAX_SUBMISSION_IMAGES - current.length;
      if (nextImages.length > available) {
        Alert.alert(
          'Image limit reached',
          `You can attach up to ${MAX_SUBMISSION_IMAGES} images.`,
        );
      }
      return [...current, ...nextImages.slice(0, Math.max(available, 0))];
    });
    setError('');
  };

  const chooseFromLibrary = async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: Math.max(MAX_SUBMISSION_IMAGES - images.length, 1),
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 0.8,
    });
    if (response.errorMessage) {
      setError(response.errorMessage);
      return;
    }
    addAssets(response.assets);
  };

  const takePhoto = async () => {
    if (!(await ensureCameraPermission())) {
      setError('Allow camera access in your device settings to take a photo.');
      return;
    }

    const response = await launchCamera({
      mediaType: 'photo',
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 0.8,
      cameraType: 'back',
    });
    if (response.errorMessage) {
      setError(response.errorMessage);
      return;
    }
    addAssets(response.assets);
  };

  const submit = async () => {
    if (loading || submissionLocked) {
      return;
    }
    if (!studentId) {
      setError('Your student account is not available.');
      return;
    }
    setSubmitting(true);
    setUploadedCount(0);
    setError('');
    try {
      await submitImageActivity(activity, studentId, images, setUploadedCount);
      await loadSubmission();
      setImages([]);
      Alert.alert(
        'Activity submitted',
        'Your work is ready for teacher review.',
        [{text: 'Done', onPress: () => navigation.goBack()}],
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit your images. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!activity.acceptsImageAttachments) {
    return (
      <Screen>
        <AppHeader
          title="Image Submission"
          subtitle="This activity is not accepting images."
        />
      </Screen>
    );
  }

  if (submissionLocked) {
    return (
      <Screen>
        <AppHeader title="Submission Checked" subtitle={activity.title} />
        <AppCard style={styles.lockedCard}>
          <View style={styles.lockedIcon}>
            <MaterialCommunityIcons
              name="lock-check-outline"
              size={28}
              color="#64748B"
            />
          </View>
          <Text style={styles.cardTitle}>Your submission is final</Text>
          <Text style={styles.cardText}>
            Your teacher has already scored this activity, so images can no
            longer be replaced.
          </Text>
          {existingSubmission?.attachments?.length ? (
            <View style={styles.imageGrid}>
              {existingSubmission.attachments.map(attachment => (
                <Image
                  key={attachment.id}
                  source={{uri: attachment.downloadUrl}}
                  style={styles.preview}
                />
              ))}
            </View>
          ) : null}
        </AppCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Submit Images" subtitle={activity.title} />
      <AppCard>
        <Text style={styles.cardTitle}>Add your work</Text>
        <Text style={styles.cardText}>
          Attach up to {MAX_SUBMISSION_IMAGES} clear photos of your completed
          work.
        </Text>
        <View style={styles.sourceRow}>
          <Pressable
            accessibilityRole="button"
            disabled={
              images.length >= MAX_SUBMISSION_IMAGES || submitting || loading
            }
            onPress={takePhoto}
            style={({pressed}) => [
              styles.sourceButton,
              pressed && styles.pressed,
            ]}>
            <MaterialCommunityIcons
              name="camera-outline"
              size={25}
              color="#2563EB"
            />
            <Text style={styles.sourceText}>Camera</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={
              images.length >= MAX_SUBMISSION_IMAGES || submitting || loading
            }
            onPress={chooseFromLibrary}
            style={({pressed}) => [
              styles.sourceButton,
              pressed && styles.pressed,
            ]}>
            <MaterialCommunityIcons
              name="image-multiple-outline"
              size={25}
              color="#2563EB"
            />
            <Text style={styles.sourceText}>Gallery</Text>
          </Pressable>
        </View>
      </AppCard>

      {existingSubmission?.attachments?.length && !images.length ? (
        <AppCard>
          <Text style={styles.cardTitle}>Current submission</Text>
          <View style={styles.imageGrid}>
            {existingSubmission.attachments.map(attachment => (
              <Image
                key={attachment.id}
                source={{uri: attachment.downloadUrl}}
                style={styles.preview}
              />
            ))}
          </View>
        </AppCard>
      ) : null}

      {images.length ? (
        <AppCard>
          <View style={styles.imageHeader}>
            <Text style={styles.cardTitle}>Ready to submit</Text>
            <Text style={styles.count}>
              {images.length}/{MAX_SUBMISSION_IMAGES}
            </Text>
          </View>
          <View style={styles.imageGrid}>
            {images.map((image, index) => (
              <View key={`${image.uri}-${index}`} style={styles.previewWrap}>
                <Image source={{uri: image.uri}} style={styles.preview} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove image ${index + 1}`}
                  disabled={submitting}
                  onPress={() =>
                    setImages(current =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  style={styles.removeButton}>
                  <MaterialCommunityIcons
                    name="close"
                    size={16}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            ))}
          </View>
        </AppCard>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {submitting && images.length ? (
        <Text style={styles.uploadProgress}>
          Uploading {uploadedCount} of {images.length} images
        </Text>
      ) : null}
      <AppButton
        disabled={loading}
        loading={submitting || loading}
        onPress={submit}>
        {existingSubmission ? 'Replace Submission' : 'Submit Activity'}
      </AppButton>
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardText: {
    color: '#52617E',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 4,
  },
  cardTitle: {color: '#081638', fontSize: 17, fontWeight: '900'},
  count: {color: '#2563EB', fontSize: 13, fontWeight: '900'},
  error: {color: '#B91C1C', fontSize: 14, fontWeight: '700', marginBottom: 8},
  imageGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14},
  imageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lockedCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  lockedIcon: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    marginBottom: 14,
    width: 56,
  },
  pressed: {opacity: 0.75},
  preview: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    height: 94,
    width: 94,
  },
  previewWrap: {height: 94, width: 94},
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: -7,
    top: -7,
    width: 26,
  },
  sourceButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderColor: '#DCE8FF',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    minHeight: 86,
    justifyContent: 'center',
  },
  sourceRow: {flexDirection: 'row', gap: 10, marginTop: 16},
  sourceText: {color: '#174EA6', fontSize: 13, fontWeight: '900'},
  uploadProgress: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
});
