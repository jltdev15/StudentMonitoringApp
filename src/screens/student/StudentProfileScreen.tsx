import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AppHeader} from '../../components/AppHeader';
import {Screen} from '../../components/Screen';
import {StatusBadge} from '../../components/StatusBadge';
import {useAuth} from '../../context/AuthContext';
import {getClassById} from '../../services/classService';
import {ClassRecord} from '../../types/models';

type EnrollmentTileProps = {
  icon: string;
  label: string;
  value: string;
  loading: boolean;
};

type DetailRowProps = {
  icon: string;
  label: string;
  value: string;
};

const emptyClassIds: string[] = [];

const EnrollmentTile = ({
  icon,
  label,
  value,
  loading,
}: EnrollmentTileProps) => (
  <View style={styles.enrollmentTile}>
    <View style={styles.tileIcon}>
      <MaterialCommunityIcons name={icon} size={22} color="#2563EB" />
    </View>
    <Text style={styles.tileLabel}>{label}</Text>
    {loading ? (
      <ActivityIndicator color="#2563EB" size="small" style={styles.loader} />
    ) : (
      <Text numberOfLines={2} style={styles.tileValue}>
        {value}
      </Text>
    )}
  </View>
);

const DetailRow = ({icon, label, value}: DetailRowProps) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <MaterialCommunityIcons name={icon} size={20} color="#2563EB" />
    </View>
    <View style={styles.detailCopy}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>
        {value}
      </Text>
    </View>
  </View>
);

export const StudentProfileScreen = () => {
  const {profile, student, signOut, loading} = useAuth();
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
    if (enrollmentLoading) {
      return '';
    }
    if (enrollmentError) {
      return 'Unavailable';
    }
    return value || 'Not assigned';
  };

  return (
    <Screen>
      <AppHeader title="Profile" subtitle="Your student account and enrollment." />

      <AppCard style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.identityCopy}>
          <Text numberOfLines={2} style={styles.name}>
            {studentName}
          </Text>
          <Text numberOfLines={1} style={styles.email}>
            {email}
          </Text>
          <StatusBadge status={status} />
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Enrollment</Text>
      <AppCard style={styles.enrollmentCard}>
        <View style={styles.enrollmentGrid}>
          <EnrollmentTile
            icon="school-outline"
            label="Grade Level"
            value={enrollmentValue(enrollment?.gradeLevel)}
            loading={enrollmentLoading}
          />
          <EnrollmentTile
            icon="account-group-outline"
            label="Section"
            value={enrollmentValue(enrollment?.section)}
            loading={enrollmentLoading}
          />
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
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </AppCard>

      <Text style={styles.sectionTitle}>Account Details</Text>
      <AppCard style={styles.detailsCard}>
        <DetailRow
          icon="card-account-details-outline"
          label="Student Number"
          value={studentNumber}
        />
        <View style={styles.divider} />
        <DetailRow icon="email-outline" label="Email" value={email} />
      </AppCard>

      <AppButton icon="logout-variant" mode="outlined" loading={loading} onPress={signOut}>
        Log out
      </AppButton>
    </Screen>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  avatarText: {
    color: '#1D4ED8',
    fontSize: 23,
    fontWeight: '900',
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: '#F2F7FF',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  detailValue: {
    color: '#081638',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },
  detailsCard: {
    gap: 16,
    marginBottom: 18,
  },
  divider: {
    backgroundColor: '#EEF2F7',
    height: 1,
  },
  email: {
    color: '#52617D',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  enrollmentCard: {
    marginBottom: 18,
  },
  enrollmentGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  enrollmentTile: {
    backgroundColor: '#F8FAFF',
    borderColor: '#E5EEFC',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 142,
    padding: 14,
  },
  identityCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: 13,
  },
  name: {
    color: '#081638',
    fontSize: 20,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.75,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    paddingVertical: 4,
  },
  retryText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#081638',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  tileIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F1FF',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  tileLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
  },
  tileValue: {
    color: '#081638',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },
});
