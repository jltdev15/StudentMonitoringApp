import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Asset,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import {useAuth} from '../../context/AuthContext';
import {getClassById} from '../../services/classService';
import {
  ProfilePhotoImage,
  uploadStudentProfilePhoto,
} from '../../services/studentService';
import {ClassRecord} from '../../types/models';
import {StudentStackParamList} from '../../types/navigation';
import {ensureCameraPermission} from '../../utils/cameraPermission';

type Props = Pick<
  NativeStackScreenProps<StudentStackParamList, 'StudentProfile'>,
  'navigation'
>;

type DetailRowProps = {
  icon: string;
  label: string;
  loading?: boolean;
  value: string;
  valueColor?: string;
};

type SummaryItemProps = {
  icon: string;
  label: string;
  loading?: boolean;
  value: string;
};

const emptyClassIds: string[] = [];
const coverBackground = require('../../assets/images/cover-bg.webp');

const toProfilePhotoImage = (asset?: Asset): ProfilePhotoImage | null => {
  if (!asset?.uri || !asset.type?.startsWith('image/')) {
    return null;
  }

  return {
    contentType: asset.type,
    fileSize: asset.fileSize,
    uri: asset.uri,
  };
};

const SummaryItem = ({icon, label, loading = false, value}: SummaryItemProps) => (
  <View style={styles.summaryItem}>
    <View style={styles.summaryIcon}>
      <MaterialCommunityIcons color="#286BE8" name={icon} size={19} />
    </View>
    <View style={styles.summaryCopy}>
      <Text numberOfLines={1} style={styles.summaryLabel}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator color="#286BE8" size="small" />
      ) : (
        <Text numberOfLines={1} style={styles.summaryValue}>
          {value}
        </Text>
      )}
    </View>
  </View>
);

const DetailRow = ({
  icon,
  label,
  loading = false,
  value,
  valueColor,
}: DetailRowProps) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <MaterialCommunityIcons color="#286BE8" name={icon} size={19} />
    </View>
    <Text numberOfLines={1} style={styles.detailLabel}>
      {label}
    </Text>
    <View style={styles.detailValueWrap}>
      {loading ? (
        <ActivityIndicator color="#286BE8" size="small" style={styles.loader} />
      ) : (
        <Text
          numberOfLines={1}
          selectable
          style={[styles.detailValue, valueColor ? {color: valueColor} : null]}>
          {value}
        </Text>
      )}
    </View>
  </View>
);

export const StudentProfileScreen = ({navigation}: Props) => {
  const {profile, refreshProfile, student, signOut, loading} = useAuth();
  const insets = useSafeAreaInsets();
  const [enrollment, setEnrollment] = useState<ClassRecord | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [enrollmentError, setEnrollmentError] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const classIds = student?.classIds?.length
    ? student.classIds
    : profile?.classIds || emptyClassIds;
  const studentName = profile?.fullName || student?.fullName || 'Student';
  const email = profile?.email || student?.email || 'No email available';
  const phone = student?.contactNumber || 'Not provided';
  const birthday = student?.dateOfBirth || 'Not provided';
  const gender = student?.gender || 'Not provided';
  const studentNumber =
    student?.studentNumber ||
    profile?.studentNumber ||
    profile?.studentId ||
    'Not available';
  const status = student?.status || profile?.status || 'inactive';
  const isActive = status === 'active';
  const initials = useMemo(
    () =>
      studentName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || 'S',
    [studentName],
  );

  const loadEnrollment = useCallback(async () => {
    setEnrollmentLoading(true);
    setEnrollmentError(false);
    try {
      const classes = await Promise.all(classIds.map(getClassById));
      const primaryClass = classes.find(
        (classItem): classItem is ClassRecord =>
          Boolean(
            classItem &&
              classItem.status === 'active' &&
              (classItem.gradeLevel || classItem.section),
          ),
      );
      setEnrollment(primaryClass || null);
    } catch {
      setEnrollment(null);
      setEnrollmentError(true);
    } finally {
      setEnrollmentLoading(false);
    }
  }, [classIds]);

  useEffect(() => {
    loadEnrollment();
  }, [loadEnrollment]);

  const selectProfilePhoto = async (source: 'camera' | 'library') => {
    if (!student || photoUploading) {
      return;
    }

    setPhotoUploading(true);
    try {
      if (source === 'camera' && !(await ensureCameraPermission())) {
        Alert.alert(
          'Camera permission needed',
          'Allow camera access in your device settings to take a profile photo.',
        );
        return;
      }

      const response =
        source === 'camera'
          ? await launchCamera({
              cameraType: 'front',
              maxHeight: 1024,
              maxWidth: 1024,
              mediaType: 'photo',
              quality: 0.8,
            })
          : await launchImageLibrary({
              maxHeight: 1024,
              maxWidth: 1024,
              mediaType: 'photo',
              quality: 0.8,
              selectionLimit: 1,
            });

      if (response.didCancel) {
        return;
      }
      if (response.errorMessage) {
        throw new Error(response.errorMessage);
      }

      const image = toProfilePhotoImage(response.assets?.[0]);
      if (!image) {
        throw new Error('Please choose a valid image file.');
      }

      await uploadStudentProfilePhoto(student.id, image);
      await refreshProfile();
      Alert.alert('Profile photo updated', 'Your new profile photo is now visible.');
    } catch (photoError) {
      Alert.alert(
        'Could not update photo',
        photoError instanceof Error
          ? photoError.message
          : 'Please try selecting another image.',
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Update profile photo', 'Choose where to get your photo.', [
      {
        text: 'Take Photo',
        onPress: () => {
          selectProfilePhoto('camera');
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: () => {
          selectProfilePhoto('library');
        },
      },
      {style: 'cancel', text: 'Cancel'},
    ]);
  };

  const enrollmentValue = (value?: string) => {
    if (enrollmentError) {
      return 'Unavailable';
    }
    return value || 'Not assigned';
  };

  const gradeLevel = enrollmentValue(enrollment?.gradeLevel);
  const section = enrollmentValue(enrollment?.section);
  const details: DetailRowProps[] = [
    {
      icon: 'card-account-details-outline',
      label: 'Student Number',
      value: studentNumber,
    },
    {icon: 'email-outline', label: 'Email', value: email},
    {icon: 'phone-outline', label: 'Phone', value: phone},
    {
      icon: 'school-outline',
      label: 'Grade Level',
      loading: enrollmentLoading,
      value: gradeLevel,
    },
    {
      icon: 'account-group-outline',
      label: 'Section',
      loading: enrollmentLoading,
      value: section,
    },
    {
      icon: 'check-circle-outline',
      label: 'Status',
      value: isActive ? 'Active' : 'Inactive',
      valueColor: isActive ? '#20AA58' : '#71809B',
    },
    {icon: 'calendar-outline', label: 'Birthday', value: birthday},
    {icon: 'account-outline', label: 'Gender', value: gender},
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}>
        <View style={[styles.heroShell, {height: 236 + insets.top}]}>
          <ImageBackground
            imageStyle={styles.coverImage}
            resizeMode="cover"
            source={coverBackground}
            style={[styles.heroImage, {height: 172 + insets.top}]}>
            <View style={styles.coverOverlay} />
          </ImageBackground>
          <View style={[styles.avatarShell, {top: 112 + insets.top}]}
          >
            <View style={styles.avatar}>
              {student?.photoUrl ? (
                <Image
                  accessibilityLabel="Student profile photo"
                  source={{uri: student.photoUrl}}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <Pressable
              accessibilityLabel="Update profile photo"
              accessibilityRole="button"
              disabled={photoUploading}
              onPress={showPhotoOptions}
              style={({pressed}) => [
                styles.photoButton,
                (pressed || photoUploading) && styles.pressed,
              ]}>
              {photoUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <MaterialCommunityIcons color="#FFFFFF" name="camera" size={19} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.identityCopy}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={2}
              style={styles.name}>
              {studentName}
            </Text>
            <Text numberOfLines={1} style={styles.email}>
              {email}
            </Text>
            <View
              accessibilityLabel={`Student status: ${status}`}
              style={[styles.statusPill, !isActive && styles.statusPillInactive]}>
              <View
                style={[
                  styles.statusPillDot,
                  !isActive && styles.statusPillDotInactive,
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  !isActive && styles.statusPillTextInactive,
                ]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <SummaryItem
              icon="school-outline"
              label="Grade Level"
              loading={enrollmentLoading}
              value={gradeLevel}
            />
            <View style={styles.summaryDivider} />
            <SummaryItem
              icon="account-group-outline"
              label="Section"
              loading={enrollmentLoading}
              value={section}
            />
            <View style={styles.summaryDivider} />
            <SummaryItem
              icon="card-account-details-outline"
              label="Student Number"
              value={studentNumber}
            />
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailsCardHeader}>
              <MaterialCommunityIcons
                color="#286BE8"
                name="information"
                size={18}
              />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>
            <View style={styles.detailsHeaderDivider} />
            {details.map((detail, index) => (
              <React.Fragment key={detail.label}>
                <DetailRow {...detail} />
                {index < details.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </View>

          {enrollmentError ? (
            <Pressable
              accessibilityLabel="Retry loading enrollment"
              accessibilityRole="button"
              onPress={loadEnrollment}
              style={({pressed}) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}>
              <MaterialCommunityIcons color="#286BE8" name="refresh" size={17} />
              <Text style={styles.retryText}>Retry loading enrollment</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
            onPress={() => navigation.navigate('EditStudentProfile')}
            style={({pressed}) => [
              styles.editButton,
              pressed && styles.pressed,
            ]}>
            <MaterialCommunityIcons color="#FFFFFF" name="pencil-outline" size={18} />
            <Text style={styles.editText}>Edit Profile</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Log out"
            accessibilityRole="button"
            disabled={loading}
            onPress={signOut}
            style={({pressed}) => [
              styles.logoutButton,
              (pressed || loading) && styles.pressed,
            ]}>
            <MaterialCommunityIcons
              color="#286BE8"
              name="logout-variant"
              size={19}
            />
            <Text style={styles.directLogoutText}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {alignItems: 'center', backgroundColor: '#E4EEFF', borderRadius: 56, height: 112, justifyContent: 'center', width: 112},
  avatarImage: {borderRadius: 56, height: 112, width: 112},
  avatarShell: {alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 62, elevation: 6, height: 124, justifyContent: 'center', position: 'absolute', shadowColor: '#12366F', shadowOffset: {height: 5, width: 0}, shadowOpacity: 0.14, shadowRadius: 11, top: 112, width: 124},
  avatarText: {color: '#2356DB', fontSize: 38, fontWeight: '900', letterSpacing: -1.5},
  content: {paddingHorizontal: 20},
  coverImage: {opacity: 0.98},
  coverOverlay: {backgroundColor: 'rgba(30, 93, 222, 0.43)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0},
  detailIcon: {alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 9, height: 35, justifyContent: 'center', width: 35},
  detailLabel: {color: '#4D6083', flex: 1, fontSize: 12, fontWeight: '800', marginLeft: 11, minWidth: 0},
  detailRow: {alignItems: 'center', flexDirection: 'row', minHeight: 55, paddingHorizontal: 13},
  detailValue: {color: '#182C5B', fontSize: 12, fontWeight: '900', textAlign: 'right'},
  detailValueWrap: {alignItems: 'flex-end', marginLeft: 12, maxWidth: '52%', minWidth: 0},
  detailsCard: {backgroundColor: '#FFFFFF', borderColor: '#E7EDF7', borderRadius: 14, borderWidth: 1, elevation: 3, shadowColor: '#6D7E9D', shadowOffset: {height: 4, width: 0}, shadowOpacity: 0.07, shadowRadius: 9},
  detailsCardHeader: {alignItems: 'center', flexDirection: 'row', minHeight: 47, paddingHorizontal: 13},
  detailsHeaderDivider: {backgroundColor: '#E8EDF5', height: 1, marginHorizontal: 13},
  directLogoutText: {color: '#286BE8', fontSize: 14, fontWeight: '900', marginLeft: 7},
  divider: {backgroundColor: '#E8EDF5', height: 1, marginLeft: 59},
  editButton: {alignItems: 'center', backgroundColor: '#1E63ED', borderRadius: 8, flexDirection: 'row', justifyContent: 'center', marginTop: 20, minHeight: 48},
  editText: {color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginLeft: 7},
  email: {color: '#71809B', fontSize: 13, fontWeight: '600', marginTop: 4, textAlign: 'center'},
  heroImage: {alignSelf: 'stretch', height: 172, overflow: 'hidden', width: '100%'},
  heroShell: {alignItems: 'center', height: 236, overflow: 'visible'},
  identityCopy: {alignItems: 'center'},
  loader: {alignSelf: 'flex-start', marginTop: 4},
  logoutButton: {alignItems: 'center', borderColor: '#AFC9FE', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', marginTop: 10, minHeight: 48},
  name: {color: '#102653', fontSize: 23, fontWeight: '900', letterSpacing: -0.6, lineHeight: 28, textAlign: 'center', textTransform: 'uppercase'},
  photoButton: {alignItems: 'center', backgroundColor: '#286BE8', borderColor: '#FFFFFF', borderRadius: 21, borderWidth: 3, bottom: -2, elevation: 4, height: 42, justifyContent: 'center', position: 'absolute', right: -2, shadowColor: '#12366F', shadowOffset: {height: 2, width: 0}, shadowOpacity: 0.18, shadowRadius: 4, width: 42},
  pressed: {opacity: 0.76, transform: [{scale: 0.99}]},
  retryButton: {alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 12, padding: 8},
  retryText: {color: '#286BE8', fontSize: 13, fontWeight: '900', marginLeft: 6},
  root: {backgroundColor: '#F8FAFE', flex: 1},
  scroll: {backgroundColor: '#F8FAFE', flex: 1},
  scrollContent: {paddingBottom: 28},
  sectionTitle: {color: '#152C5E', fontSize: 14, fontWeight: '900', marginLeft: 7},
  statusPill: {alignItems: 'center', backgroundColor: '#E1F8E9', borderRadius: 12, flexDirection: 'row', marginTop: 8, paddingHorizontal: 9, paddingVertical: 4},
  statusPillDot: {backgroundColor: '#25B85D', borderRadius: 4, height: 8, marginRight: 5, width: 8},
  statusPillDotInactive: {backgroundColor: '#94A3B8'},
  statusPillInactive: {backgroundColor: '#EEF2F7'},
  statusPillText: {color: '#199A49', fontSize: 11, fontWeight: '900'},
  statusPillTextInactive: {color: '#64748B'},
  summaryCard: {alignItems: 'stretch', backgroundColor: '#FFFFFF', borderColor: '#E6EDF8', borderRadius: 13, borderWidth: 1, elevation: 3, flexDirection: 'row', marginBottom: 20, marginTop: 15, minHeight: 78, paddingVertical: 15, shadowColor: '#607798', shadowOffset: {height: 4, width: 0}, shadowOpacity: 0.08, shadowRadius: 10},
  summaryCopy: {flex: 1, marginLeft: 8, minWidth: 0},
  summaryDivider: {backgroundColor: '#E6ECF6', width: 1},
  summaryIcon: {alignItems: 'center', backgroundColor: '#EEF4FF', borderRadius: 11, height: 37, justifyContent: 'center', width: 37},
  summaryItem: {alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0, paddingHorizontal: 9},
  summaryLabel: {color: '#7081A0', fontSize: 9, fontWeight: '800'},
  summaryValue: {color: '#1A2D5D', fontSize: 13, fontWeight: '900', marginTop: 4},
});
