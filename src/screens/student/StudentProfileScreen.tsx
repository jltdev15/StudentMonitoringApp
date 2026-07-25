import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuth} from '../../context/AuthContext';
import {getClassById} from '../../services/classService';
import {ClassRecord} from '../../types/models';

type DetailRowProps = {
  icon: string;
  label: string;
  loading?: boolean;
  value: string;
};

const emptyClassIds: string[] = [];
const coverBackground = require('../../assets/images/cover-bg.webp');

const DetailRow = ({icon, label, loading = false, value}: DetailRowProps) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <MaterialCommunityIcons name={icon} size={25} color="#2563EB" />
    </View>
    <View style={styles.detailCopy}>
      <Text style={styles.detailLabel}>{label}</Text>
      {loading ? (
        <ActivityIndicator color="#2563EB" size="small" style={styles.loader} />
      ) : (
        <Text numberOfLines={2} selectable style={styles.detailValue}>
          {value}
        </Text>
      )}
    </View>
  </View>
);

export const StudentProfileScreen = () => {
  const {profile, student, signOut, loading} = useAuth();
  const insets = useSafeAreaInsets();
  const [enrollment, setEnrollment] = useState<ClassRecord | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [enrollmentError, setEnrollmentError] = useState(false);

  const classIds = student?.classIds?.length
    ? student.classIds
    : profile?.classIds || emptyClassIds;
  const studentName = profile?.fullName || student?.fullName || 'Student';
  const email = profile?.email || student?.email || 'No email available';
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

  const enrollmentValue = (value?: string) => {
    if (enrollmentError) {
      return 'Unavailable';
    }
    return value || 'Not assigned';
  };

  const details: DetailRowProps[] = [
    {
      icon: 'school-outline',
      label: 'Grade Level',
      loading: enrollmentLoading,
      value: enrollmentValue(enrollment?.gradeLevel),
    },
    {
      icon: 'account-group-outline',
      label: 'Section',
      loading: enrollmentLoading,
      value: enrollmentValue(enrollment?.section),
    },
    {
      icon: 'card-account-details-outline',
      label: 'Student Number',
      value: studentNumber,
    },
    {icon: 'email-outline', label: 'Email', value: email},
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}>
        <ImageBackground
          imageStyle={styles.coverImage}
          resizeMode="cover"
          source={coverBackground}
          style={[styles.cover, {paddingTop: insets.top}]} />

        <View style={styles.profileContent}>
          <View style={styles.avatarShell}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View
              accessibilityLabel={isActive ? 'Active student' : 'Inactive student'}
              style={[styles.statusDot, !isActive && styles.statusDotInactive]}
            />
          </View>

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

          <View style={styles.detailsCard}>
            {details.map((detail, index) => (
              <React.Fragment key={detail.label}>
                <DetailRow {...detail} />
                {index < details.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </View>

          {enrollmentError ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading enrollment"
              onPress={loadEnrollment}
              style={({pressed}) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}>
              <MaterialCommunityIcons name="refresh" size={18} color="#2563EB" />
              <Text style={styles.retryText}>Retry loading enrollment</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            disabled={loading}
            onPress={signOut}
            style={({pressed}) => [
              styles.logoutButton,
              (pressed || loading) && styles.pressed,
            ]}>
            <MaterialCommunityIcons
              name="logout-variant"
              size={22}
              color="#2563EB"
            />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {backgroundColor: '#FFFFFF', flex: 1},
  scroll: {backgroundColor: '#FFFFFF', flex: 1},
  scrollContent: {paddingBottom: 30},
  cover: {height: 224, width: '100%'},
  coverImage: {opacity: 0.98},
  profileContent: {alignItems: 'center', paddingHorizontal: 24},
  avatarShell: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 82,
    elevation: 6,
    height: 146,
    justifyContent: 'center',
    marginTop: -73,
    shadowColor: '#0B326B',
    shadowOffset: {height: 6, width: 0},
    shadowOpacity: 0.14,
    shadowRadius: 12,
    width: 146,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EAF1FF',
    borderRadius: 70,
    height: 134,
    justifyContent: 'center',
    width: 134,
  },
  avatarText: {
    color: '#2855E8',
    fontSize: 41,
    fontWeight: '900',
    letterSpacing: -2,
  },
  statusDot: {
    backgroundColor: '#31C66B',
    borderColor: '#FFFFFF',
    borderRadius: 23,
    borderWidth: 5,
    bottom: 4,
    height: 46,
    position: 'absolute',
    right: 3,
    width: 46,
  },
  statusDotInactive: {backgroundColor: '#94A3B8'},
  identityCopy: {alignItems: 'center', marginTop: 20, width: '100%'},
  name: {
    color: '#102653',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -1.1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  email: {
    color: '#687895',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: '#E4F8EB',
    borderRadius: 24,
    flexDirection: 'row',
    marginTop: 17,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  statusPillInactive: {backgroundColor: '#EEF2F7'},
  statusPillDot: {
    backgroundColor: '#22B95C',
    borderRadius: 7,
    height: 12,
    marginRight: 8,
    width: 12,
  },
  statusPillDotInactive: {backgroundColor: '#94A3B8'},
  statusPillText: {color: '#17A34A', fontSize: 16, fontWeight: '900'},
  statusPillTextInactive: {color: '#64748B'},
  detailsCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4ECF9',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 4,
    marginTop: 25,
    paddingHorizontal: 16,
    shadowColor: '#6A7EA5',
    shadowOffset: {height: 5, width: 0},
    shadowOpacity: 0.1,
    shadowRadius: 11,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 104,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderRadius: 15,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  detailCopy: {flex: 1, marginLeft: 16, minWidth: 0},
  detailLabel: {color: '#6B7A97', fontSize: 16, fontWeight: '800'},
  detailValue: {
    color: '#132A58',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },
  loader: {alignSelf: 'flex-start', marginTop: 11},
  divider: {backgroundColor: '#E7EDF7', height: 1},
  retryButton: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 15,
    padding: 8,
  },
  retryText: {color: '#2563EB', fontSize: 14, fontWeight: '900', marginLeft: 7},
  logoutButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: '#C9D9FF',
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    minHeight: 66,
  },
  logoutText: {color: '#2563EB', fontSize: 18, fontWeight: '900', marginLeft: 11},
  pressed: {opacity: 0.76, transform: [{scale: 0.99}]},
});
