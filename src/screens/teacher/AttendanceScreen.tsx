import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AppButton} from '../../components/AppButton';
import {AppCard} from '../../components/AppCard';
import {AttendanceClassSelector} from '../../components/AttendanceClassSelector';
import {AttendanceStatusButton} from '../../components/AttendanceStatusButton';
import {EmptyState} from '../../components/EmptyState';
import {useAuth} from '../../context/AuthContext';
import {
  getAttendanceByClassAndDate,
  saveAttendanceBatch,
} from '../../services/attendanceService';
import {getTeacherClasses} from '../../services/classService';
import {getStudentsByClass} from '../../services/studentService';
import {
  AttendanceDraft,
  AttendanceStatus,
  ClassRecord,
  StudentRecord,
} from '../../types/models';
import {TeacherStackParamList} from '../../types/navigation';
import {attendanceStatuses} from '../../utils/constants';
import {toDateString} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<TeacherStackParamList, 'Attendance'>;

const toReadableAttendanceDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

export const AttendanceScreen = ({route, navigation}: Props) => {
  const {profile} = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classId, setClassId] = useState(route.params?.classId || '');
  const [date] = useState(toDateString());
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({});
  // Keep this hook slot stable for React Native Fast Refresh after removing the old menu picker.
  useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  // Keep this hook slot stable for React Native Fast Refresh after simplifying the header.
  useMemo(() => null, []);
  const [searchQuery, setSearchQuery] = useState('');

  const readableDate = useMemo(() => toReadableAttendanceDate(date), [date]);
  const hasAttendanceDrafts = Boolean(classId && Object.values(drafts).length);
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return students;
    }
    return students.filter(student =>
      [student.fullName, student.studentNumber]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query)),
    );
  }, [searchQuery, students]);

  const loadClasses = useCallback(async () => {
    if (profile) {
      const nextClasses = await getTeacherClasses(profile.uid);
      setClasses(nextClasses);
    }
  }, [profile]);

  const loadClassData = useCallback(async () => {
    if (!classId) {
      setStudents([]);
      setDrafts({});
      return;
    }
    setStudents([]);
    setDrafts({});
    const [nextStudents, attendance] = await Promise.all([
      getStudentsByClass(classId),
      getAttendanceByClassAndDate(classId, date),
    ]);
    const attendanceByStudent = Object.fromEntries(
      attendance.map(item => [item.studentId, item]),
    );
    nextStudents.sort((a, b) => a.fullName.localeCompare(b.fullName));
    setStudents(nextStudents);
    setDrafts(
      Object.fromEntries(
        nextStudents.map(student => [
          student.id,
          {
            studentId: student.id,
            status: attendanceByStudent[student.id]?.status || null,
            remarks: attendanceByStudent[student.id]?.remarks || '',
          },
        ]),
      ),
    );
  }, [classId, date]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  const updateDraft = (
    studentId: string,
    changes: Partial<AttendanceDraft>,
  ) => {
    setDrafts(current => ({
      ...current,
      [studentId]: {...current[studentId], ...changes, studentId},
    }));
  };

  const selectClass = (nextClassId: string) => {
    setClassId(nextClassId);
    setSearchQuery('');
    setSuccessMessage('');
    setErrorMessage('');
  };

  const changeClass = () => {
    setClassId('');
    setStudents([]);
    setDrafts({});
    setSearchQuery('');
    setSuccessMessage('');
    setErrorMessage('');
  };

  const save = async () => {
    if (!profile || !classId || !Object.values(drafts).length) {
      return;
    }
    const pendingCount = Object.values(drafts).filter(d => !d.status).length;
    if (pendingCount > 0) {
      setErrorMessage(`Please mark attendance for all students. ${pendingCount} remaining.`);
      return;
    }
    setSuccessMessage('');
    setErrorMessage('');
    setSaving(true);
    try {
      await saveAttendanceBatch(
        classId,
        date,
        profile.uid,
        Object.values(drafts) as (AttendanceDraft & {status: AttendanceStatus})[],
      );
      setSuccessMessage('Attendance saved successfully.');
      setTimeout(() => {
        setSuccessMessage(current =>
          current === 'Attendance saved successfully.' ? '' : current,
        );
      }, 3000);
    } catch (saveError) {
      setErrorMessage(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save attendance. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          hasAttendanceDrafts && styles.contentWithStickyAction,
        ]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={navigation.goBack}
            style={({pressed}) => [
              styles.headerIconButton,
              pressed && styles.pressed,
            ]}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={30}
              color="#FFFFFF"
            />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Attendance</Text>
            <Text style={styles.headerSubtitle}>{readableDate}</Text>
          </View>
          <View style={styles.headerIconButton}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>
        </View>
        {successMessage ? (
          <View style={[styles.feedbackCard, styles.successCard]}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color="#16A34A"
            />
            <Text style={[styles.feedbackText, styles.successText]}>
              {successMessage}
            </Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View style={[styles.feedbackCard, styles.errorCard]}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color="#DC2626"
            />
            <Text style={[styles.feedbackText, styles.errorText]}>
              {errorMessage}
            </Text>
          </View>
        ) : null}
        <AttendanceClassSelector
          classes={classes}
          selectedClassId={classId}
          onSelectClass={selectClass}
          onClearClass={changeClass}
        />
        {classId && students.length ? (
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color="#52617E"
            />
            <TextInput
              placeholder="Search students"
              placeholderTextColor="#8A94A8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearchQuery('')}
                style={({pressed}) => pressed && styles.pressed}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color="#8A94A8"
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {!classId ? (
          <EmptyState
            title="Choose a class"
            message="Select a class above to load students for attendance."
          />
        ) : filteredStudents.length ? (
          filteredStudents.map(student => {
            const draft = drafts[student.id];
            return (
              <AppCard key={student.id}>
                <Text variant="titleMedium" style={styles.name}>
                  {student.fullName}
                </Text>
                <Text style={styles.meta}>{student.studentNumber}</Text>
                <View style={styles.statusRow}>
                  {attendanceStatuses.map(status => (
                    <AttendanceStatusButton
                      key={status}
                      status={status}
                      selected={draft?.status === status}
                      onPress={() => updateDraft(student.id, {status})}
                    />
                  ))}
                </View>
              </AppCard>
            );
          })
        ) : students.length ? (
          <EmptyState
            title="No matching students"
            message="Try a different name or student number."
          />
        ) : (
          <EmptyState
            title="No students"
            message="This class has no active students."
          />
        )}
      </ScrollView>
      {hasAttendanceDrafts ? (
        <View style={styles.stickyActionBar}>
          <AppButton loading={saving} onPress={save} style={styles.stickyButton}>
            Save Attendance
          </AppButton>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  contentWithStickyAction: {
    paddingBottom: 128,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#B91C1C',
  },
  feedbackCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#062A66',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    marginHorizontal: -20,
    marginTop: -20,
    minHeight: 104,
    paddingBottom: 22,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerIconButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerSubtitle: {
    color: '#E7EEFD',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  meta: {color: '#64748B', marginBottom: 10},
  name: {fontWeight: '800'},
  pressed: {
    opacity: 0.78,
  },
  root: {
    backgroundColor: '#F6F9FE',
    flex: 1,
  },
  scroll: {
    backgroundColor: '#F6F9FE',
    flex: 1,
  },
  searchInput: {
    color: '#081638',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 48,
    padding: 0,
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE8F8',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 14,
    shadowColor: '#7685A3',
    shadowOffset: {height: 8, width: 0},
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  stickyActionBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E8EDF5',
    borderTopWidth: 1,
    elevation: 8,
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#7685A3',
    shadowOffset: {height: -8, width: 0},
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  stickyButton: {
    marginTop: 0,
  },
  statusRow: {flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 4},
  successCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  successText: {
    color: '#15803D',
  },
});
