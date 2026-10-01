import {
  addDoc,
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type FirestoreError,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {deleteObject, getDownloadURL, ref as storageRef, uploadBytes} from 'firebase/storage';
import {db, storage} from './firebase';
import type {
  ActivityMaterial,
  ActivityRecord,
  AnnouncementRecord,
  AttendanceRecord,
  AttendanceStatus,
  ClassRecord,
  StudentRecord,
  SubmissionRecord,
  SubmissionStatus,
  UserProfile,
} from './types';

const record = <T>(snapshot: QueryDocumentSnapshot<DocumentData>) =>
  ({id: snapshot.id, ...snapshot.data()}) as T;

export const getUserProfile = async (uid: string) => {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? ({uid, ...snapshot.data()} as UserProfile) : null;
};

export const getTeacherClasses = async (teacherId: string) => {
  const result = await getDocs(query(collection(db, 'classes'), where('teacherId', '==', teacherId), where('status', '==', 'active')));
  return result.docs.map(item => record<ClassRecord>(item)).sort((a, b) => a.className.localeCompare(b.className));
};

export const saveClass = async (teacherId: string, payload: Omit<ClassRecord, 'id' | 'teacherId' | 'status'>, id?: string) => {
  const data = {...payload, teacherId, status: 'active', updatedAt: serverTimestamp()};
  if (id) {
    await updateDoc(doc(db, 'classes', id), data);
    return id;
  }
  const ref = await addDoc(collection(db, 'classes'), {...data, createdAt: serverTimestamp()});
  return ref.id;
};

export const archiveClass = (classId: string) => updateDoc(doc(db, 'classes', classId), {
  status: 'archived',
  updatedAt: serverTimestamp(),
});

export const getStudentsByClass = async (classId: string) => {
  const result = await getDocs(query(collection(db, 'students'), where('classIds', 'array-contains', classId), where('status', '==', 'active')));
  return result.docs.map(item => record<StudentRecord>(item)).sort((a, b) => a.fullName.localeCompare(b.fullName));
};

export const saveStudent = async (payload: Omit<StudentRecord, 'id' | 'status'>, id?: string) => {
  const data = {
    ...payload,
    studentNumber: payload.studentNumber.trim(),
    fullName: payload.fullName.trim(),
    email: payload.email.trim().toLowerCase(),
    status: 'active',
    updatedAt: serverTimestamp(),
  };
  if (id) {
    await updateDoc(doc(db, 'students', id), data);
    return id;
  }
  const ref = await addDoc(collection(db, 'students'), {...data, createdAt: serverTimestamp()});
  return ref.id;
};

export const archiveStudent = (id: string) => updateDoc(doc(db, 'students', id), {status: 'inactive', updatedAt: serverTimestamp()});

export const updateStudentProfile = async (
  studentId: string,
  payload: Pick<StudentRecord, 'contactNumber' | 'guardianName' | 'guardianContact'> & {dateOfBirth: string; gender: string},
) => {
  await updateDoc(doc(db, 'students', studentId), {
    contactNumber: payload.contactNumber.trim(),
    dateOfBirth: payload.dateOfBirth,
    gender: payload.gender.trim(),
    guardianName: payload.guardianName.trim(),
    guardianContact: payload.guardianContact.trim(),
    updatedAt: serverTimestamp(),
  });
};

export const attendanceIdFor = (classId: string, studentId: string, date: string) => `${classId}_${studentId}_${date}`;

export type AttendanceSaveStage = 'attendance-validation' | 'attendance-write' | 'session-summary' | 'refresh';

export class AttendanceSaveError extends Error {
  readonly code: string;
  readonly stage: AttendanceSaveStage;
  readonly cause?: unknown;

  constructor(stage: AttendanceSaveStage, code: string, message: string, options?: {cause?: unknown}) {
    super(message);
    this.name = 'AttendanceSaveError';
    this.stage = stage;
    this.code = code;
    this.cause = options?.cause;
  }
}

const attendanceStatuses = new Set<AttendanceStatus>(['present', 'late', 'absent', 'excused']);
const transientAttendanceCodes = new Set(['aborted', 'deadline-exceeded', 'unavailable']);

const firebaseErrorCode = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('code' in value)) return 'unknown';
  return String((value as Pick<FirestoreError, 'code'>).code).replace(/^firestore\//, '');
};

const attendanceErrorMessage = (stage: AttendanceSaveStage, code: string) => {
  if (code === 'permission-denied') return 'The signed-in teacher is not allowed to save attendance for this class.';
  if (code === 'unauthenticated') return 'Your session has expired. Sign in again before saving attendance.';
  if (code === 'invalid-argument' || stage === 'attendance-validation') return 'The attendance information is incomplete or invalid.';
  if (transientAttendanceCodes.has(code)) return 'The attendance service is temporarily unavailable. Your selections were not changed; please try again.';
  return 'Attendance could not be saved. Your selections were not changed; please try again.';
};

const normalizeAttendanceError = (stage: AttendanceSaveStage, value: unknown) => {
  if (value instanceof AttendanceSaveError) return value;
  const code = firebaseErrorCode(value);
  if (import.meta.env.DEV) console.warn('Attendance operation failed.', {stage, code});
  return new AttendanceSaveError(stage, code, attendanceErrorMessage(stage, code), {cause: value});
};

export const getAttendance = async (classId: string, date: string) => {
  const result = await getDocs(query(collection(db, 'attendance'), where('classId', '==', classId), where('date', '==', date)));
  return result.docs.map(item => record<AttendanceRecord>(item));
};

export const saveAttendance = async (classId: string, date: string, teacherId: string, items: {studentId: string; status: AttendanceStatus; remarks: string}[]) => {
  if (!classId || !teacherId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !items.length
    || items.some(item => !item.studentId || !attendanceStatuses.has(item.status))) {
    throw normalizeAttendanceError('attendance-validation', {code: 'invalid-argument'});
  }

  try {
    const [teacherSnapshot, classSnapshot, enrolledStudents] = await Promise.all([
      getDoc(doc(db, 'users', teacherId)),
      getDoc(doc(db, 'classes', classId)),
      getDocs(query(collection(db, 'students'), where('classIds', 'array-contains', classId), where('status', '==', 'active'))),
    ]);
    const teacher = teacherSnapshot.data();
    if (!teacherSnapshot.exists() || teacher?.role !== 'teacher' || teacher?.status !== 'active') {
      throw new AttendanceSaveError('attendance-validation', 'unauthenticated', attendanceErrorMessage('attendance-validation', 'unauthenticated'));
    }
    if (!classSnapshot.exists() || classSnapshot.data().teacherId !== teacherId) {
      throw new AttendanceSaveError('attendance-validation', 'permission-denied', attendanceErrorMessage('attendance-validation', 'permission-denied'));
    }
    const enrolledIds = new Set(enrolledStudents.docs.map(item => item.id));
    if (items.some(item => !enrolledIds.has(item.studentId))) {
      throw new AttendanceSaveError('attendance-validation', 'invalid-argument', 'One or more students are no longer enrolled in this class. Refresh the roster and try again.');
    }
  } catch (value) {
    throw normalizeAttendanceError('attendance-validation', value);
  }

  const existing = await getAttendance(classId, date).catch(value => {
    throw normalizeAttendanceError('attendance-write', value);
  });
  const existingIds = new Set(existing.map(item => item.id));
  const commitAttendance = async () => {
    const batch = writeBatch(db);
    items.forEach(item => {
      const reference = doc(db, 'attendance', attendanceIdFor(classId, item.studentId, date));
      const mutableData = {
        studentId: item.studentId,
        status: item.status,
        remarks: item.remarks,
        classId,
        date,
        recordedBy: teacherId,
        updatedAt: serverTimestamp(),
      };
      if (existingIds.has(reference.id)) batch.update(reference, mutableData);
      else batch.set(reference, {...mutableData, createdAt: serverTimestamp()});
    });
    await batch.commit();
  };

  try {
    await commitAttendance();
  } catch (firstError) {
    const code = firebaseErrorCode(firstError);
    if (!transientAttendanceCodes.has(code)) throw normalizeAttendanceError('attendance-write', firstError);
    try {
      await commitAttendance();
    } catch (retryError) {
      throw normalizeAttendanceError('attendance-write', retryError);
    }
  }

  // Attendance is the primary teacher action. The session document powers the
  // optional whole-school feed, so keep it outside the attendance batch. This
  // prevents an older deployed rule set that does not yet allow
  // `attendanceSessions` from rejecting every attendance record.
  const statusCounts = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
  try {
    await setDoc(doc(db, 'attendanceSessions', `${classId}_${date}`), {
      classId,
      date,
      recordedBy: teacherId,
      presentCount: statusCounts.present || 0,
      totalCount: items.length,
      statusCounts,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, {merge: true});
    return {attendanceSaved: true, sessionSummarySaved: true};
  } catch (value) {
    // The attendance records were committed above. Callers can warn that the
    // optional feed summary is pending without incorrectly reporting a failed
    // attendance save.
    const summaryError = normalizeAttendanceError('session-summary', value);
    return {attendanceSaved: true, sessionSummarySaved: false, sessionSummaryErrorCode: summaryError.code};
  }
};

export const getActivities = async (classId: string) => {
  const result = await getDocs(query(collection(db, 'activities'), where('classId', '==', classId)));
  return result.docs.map(item => record<ActivityRecord>(item));
};

export const saveActivity = async (teacherId: string, payload: Omit<ActivityRecord, 'id' | 'createdBy' | 'status'>, id?: string) => {
  const data = {...payload, createdBy: teacherId, status: 'active', updatedAt: serverTimestamp()};
  if (id) {
    await updateDoc(doc(db, 'activities', id), data);
    return id;
  }
  const ref = await addDoc(collection(db, 'activities'), {...data, createdAt: serverTimestamp()});
  return ref.id;
};

const safeStorageFileName = (fileName: string) =>
  fileName.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'material';

export const uploadActivityMaterials = async (activityId: string, files: File[]): Promise<ActivityMaterial[]> =>
  Promise.all(files.map(async (file, index) => {
    const id = crypto.randomUUID();
    const path = `activity-materials/${activityId}/${id}-${safeStorageFileName(file.name)}`;
    const target = storageRef(storage, path);
    const contentType = file.type || (/\.html?$/i.test(file.name) ? 'text/html' : 'application/octet-stream');
    await uploadBytes(target, file, {contentType});
    return {
      id,
      storagePath: path,
      downloadUrl: await getDownloadURL(target),
      fileName: file.name,
      contentType,
      size: file.size,
      order: index,
    };
  }));

export const removeActivityMaterial = async (
  activityId: string,
  material: ActivityMaterial,
  kind: 'material' | 'peta-output',
) => {
  const activityRef = doc(db, 'activities', activityId);
  const snapshot = await getDoc(activityRef);
  if (!snapshot.exists()) throw new Error('The activity no longer exists.');

  const activity = snapshot.data() as ActivityRecord;
  if (kind === 'material') {
    await updateDoc(activityRef, {
      materials: (activity.materials || []).filter(item => item.id !== material.id),
      updatedAt: serverTimestamp(),
    });
  } else {
    const outputs = activity.petaOutputs || (activity.petaOutput ? [activity.petaOutput] : []);
    await updateDoc(activityRef, {
      petaOutputs: outputs.filter(item => item.id !== material.id),
      petaOutput: null,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await deleteObject(storageRef(storage, material.storagePath));
  } catch (value) {
    if (!(typeof value === 'object' && value && 'code' in value && value.code === 'storage/object-not-found')) throw value;
  }
};

export const closeActivity = (id: string) => updateDoc(doc(db, 'activities', id), {status: 'closed', closedAt: serverTimestamp(), updatedAt: serverTimestamp()});

export const getSubmissions = async (activityId: string, classId?: string) => {
  // Teacher reads must constrain the query to an owned class; filtering the
  // activity client-side also avoids requiring a composite Firestore index.
  const result = await getDocs(query(collection(db, 'activitySubmissions'), where(classId ? 'classId' : 'activityId', '==', classId || activityId)));
  return result.docs.map(item => record<SubmissionRecord>(item)).filter(item => item.activityId === activityId);
};

export const saveScores = async (activity: ActivityRecord, teacherId: string, items: {studentId: string; status: SubmissionStatus; score: number | null; remarks: string}[]) => {
  const batch = writeBatch(db);
  items.forEach(item => {
    batch.set(doc(db, 'activitySubmissions', `${activity.id}_${item.studentId}`), {
      ...item,
      activityId: activity.id,
      classId: activity.classId,
      checkedBy: teacherId,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, {merge: true});
  });
  await batch.commit();
};

export const submitStudentQuiz = async (activityId: string, classId: string, studentId: string, score: number, answers?: Record<string, any>) => {
  await setDoc(doc(db, 'activitySubmissions', `${activityId}_${studentId}`), {
    activityId,
    classId,
    studentId,
    status: 'submitted',
    score,
    ...(answers ? { answers } : {}),
    remarks: 'Auto-graded Quiz',
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, {merge: true});
};

export const getAnnouncements = async (teacherId: string) => {
  const result = await getDocs(query(collection(db, 'announcements'), where('postedBy', '==', teacherId)));
  return result.docs.map(item => record<AnnouncementRecord>(item)).sort((a, b) => createdAt(b) - createdAt(a));
};

const createdAt = (announcement: AnnouncementRecord) => {
  const value = announcement.createdAt;
  return value && 'toMillis' in value ? value.toMillis() : value instanceof Date ? value.getTime() : 0;
};

export const saveAnnouncement = async (teacherId: string, payload: Omit<AnnouncementRecord, 'id' | 'postedBy' | 'createdAt'>, id?: string) => {
  if (id) {
    await updateDoc(doc(db, 'announcements', id), {...payload, updatedAt: serverTimestamp()});
    return id;
  }
  const ref = await addDoc(collection(db, 'announcements'), {...payload, postedBy: teacherId, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});
  return ref.id;
};

export const setAnnouncementFeatured = (announcementId: string, featured: boolean) =>
  updateDoc(doc(db, 'announcements', announcementId), {featured, updatedAt: serverTimestamp()});

export const deleteAnnouncement = async (announcementId: string) => {
  await deleteDoc(doc(db, 'announcements', announcementId));
};

export type ResetTotals = {
  attendance: number;
  activities: number;
  activitySubmissions: number;
  announcements: number;
};

const chunks = <T>(items: T[], size: number) =>
  Array.from({length: Math.ceil(items.length / size)}, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

const deleteQuery = async (source: ReturnType<typeof query>) => {
  let deleted = 0;
  while (true) {
    const snapshot = await getDocs(query(source, limit(450)));
    if (snapshot.empty) return deleted;
    const batch = writeBatch(db);
    snapshot.docs.forEach(item => batch.delete(item.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
};

export const deleteClass = async (classId: string) => {
  const classSnapshot = await getDoc(doc(db, 'classes', classId));
  if (!classSnapshot.exists()) throw new Error('The class no longer exists.');

  const activitySnapshot = await getDocs(query(collection(db, 'activities'), where('classId', '==', classId)));
  const storagePaths = activitySnapshot.docs.flatMap(item => {
    const activity = item.data() as ActivityRecord;
    return [...(activity.materials || []), ...(activity.petaOutputs || []), ...(activity.petaOutput ? [activity.petaOutput] : [])]
      .map(material => material.storagePath)
      .filter(Boolean);
  });
  await Promise.all(storagePaths.map(async path => {
    try {
      await deleteObject(storageRef(storage, path));
    } catch (value) {
      if (!(typeof value === 'object' && value && 'code' in value && value.code === 'storage/object-not-found')) throw value;
    }
  }));

  const roster = await getDocs(query(collection(db, 'students'), where('classIds', 'array-contains', classId)));
  for (const rosterChunk of chunks(roster.docs, 400)) {
    const batch = writeBatch(db);
    rosterChunk.forEach(student => batch.update(student.ref, {classIds: arrayRemove(classId), updatedAt: serverTimestamp()}));
    await batch.commit();
  }

  const totals = {
    attendance: await deleteQuery(query(collection(db, 'attendance'), where('classId', '==', classId))),
    submissions: await deleteQuery(query(collection(db, 'activitySubmissions'), where('classId', '==', classId))),
    announcements: await deleteQuery(query(collection(db, 'announcements'), where('classId', '==', classId))),
    activities: await deleteQuery(query(collection(db, 'activities'), where('classId', '==', classId))),
  };
  // Keep a minimal tombstone because existing production rules intentionally
  // disallow deleting class documents. All user-facing and related data is removed.
  await updateDoc(doc(db, 'classes', classId), {status: 'deleted', updatedAt: serverTimestamp()});
  return {...totals, studentsUpdated: roster.size, filesRemoved: storagePaths.length};
};

export const resetTeacherData = async (teacherId: string): Promise<ResetTotals> => {
  const ownedClasses = await getDocs(query(collection(db, 'classes'), where('teacherId', '==', teacherId)));
  const classIds = ownedClasses.docs.map(item => item.id);
  const totals: ResetTotals = {attendance: 0, activities: 0, activitySubmissions: 0, announcements: 0};

  for (const classIdChunk of chunks(classIds, 30)) {
    totals.attendance += await deleteQuery(query(collection(db, 'attendance'), where('classId', 'in', classIdChunk)));
  }
  totals.announcements = await deleteQuery(query(collection(db, 'announcements'), where('postedBy', '==', teacherId)));
  for (const classIdChunk of chunks(classIds, 30)) {
    totals.activitySubmissions += await deleteQuery(query(collection(db, 'activitySubmissions'), where('classId', 'in', classIdChunk)));
    totals.activities += await deleteQuery(query(collection(db, 'activities'), where('classId', 'in', classIdChunk)));
  }
  return totals;
};

// Student Functions
export const getStudentRecordByUserId = async (userId: string) => {
  const result = await getDocs(query(collection(db, 'students'), where('userId', '==', userId), where('status', '==', 'active'), limit(1)));
  return result.empty ? null : record<StudentRecord>(result.docs[0]);
};

export const getClassesByIds = async (classIds: string[]) => {
  if (!classIds.length) return [];
  const result: ClassRecord[] = [];
  for (const chunk of chunks(classIds, 30)) {
    const snapshot = await getDocs(query(collection(db, 'classes'), where('__name__', 'in', chunk)));
    result.push(...snapshot.docs.map(item => record<ClassRecord>(item)).filter(item => item.status === 'active'));
  }
  return result.sort((a, b) => a.className.localeCompare(b.className));
};

export const getStudentAttendanceRecords = async (studentId: string) => {
  const result = await getDocs(query(collection(db, 'attendance'), where('studentId', '==', studentId)));
  return result.docs.map(item => record<AttendanceRecord>(item));
};

export const getStudentSubmissions = async (studentId: string, classIds: string[] = []) => {
  if (!classIds.length) return [];

  // Student rules authorize submissions only when both the student and class
  // match the authenticated student's enrolled classes. Query each class so
  // Firestore can prove that every returned document is permitted.
  const snapshots = await Promise.all(classIds.map(classId => getDocs(query(
    collection(db, 'activitySubmissions'),
    where('studentId', '==', studentId),
    where('classId', '==', classId),
  ))));

  const submissions = new Map<string, SubmissionRecord>();
  snapshots.forEach(snapshot => snapshot.docs.forEach(item => {
    const submission = record<SubmissionRecord>(item);
    submissions.set(submission.id, submission);
  }));
  return [...submissions.values()];
};

export const getStudentActivities = async (classIds: string[]) => {
  if (!classIds.length) return [];
  const result: ActivityRecord[] = [];
  for (const chunk of chunks(classIds, 30)) {
    const snapshot = await getDocs(query(collection(db, 'activities'), where('classId', 'in', chunk)));
    result.push(...snapshot.docs.map(item => record<ActivityRecord>(item)));
  }
  return result.sort((a, b) => {
    const aTime = a.dueDate ? (a.dueDate instanceof Date ? a.dueDate.getTime() : a.dueDate.toMillis()) : 0;
    const bTime = b.dueDate ? (b.dueDate instanceof Date ? b.dueDate.getTime() : b.dueDate.toMillis()) : 0;
    return aTime - bTime;
  });
};

export const getStudentAnnouncements = async (classIds: string[]) => {
  const result: AnnouncementRecord[] = [];
  if (classIds.length > 0) {
    for (const chunk of chunks(classIds, 30)) {
      const snapshot = await getDocs(query(collection(db, 'announcements'), where('classId', 'in', chunk)));
      result.push(...snapshot.docs.map(item => record<AnnouncementRecord>(item)));
    }
  }
  const globalSnapshot = await getDocs(query(collection(db, 'announcements'), where('classId', '==', null)));
  result.push(...globalSnapshot.docs.map(item => record<AnnouncementRecord>(item)));
  
  return result.filter(a => a.targetRole === 'all' || a.targetRole === 'students')
    .sort((a, b) => createdAt(b) - createdAt(a));
};

export const findRosterStudent = async (studentNumber: string) => {
  const normalized = studentNumber.trim().toUpperCase();
  const snapshot = await getDocs(
    query(
      collection(db, 'students'),
      where('studentNumber', '==', normalized),
      where('status', '==', 'active'),
      where('userId', '==', null),
      limit(1),
    ),
  );
  return snapshot.empty ? null : record<StudentRecord>(snapshot.docs[0]);
};

export const claimRosterStudent = async (studentId: string, userId: string, email: string) => {
  await updateDoc(doc(db, 'students', studentId), {
    userId,
    email: email.trim().toLowerCase(),
    updatedAt: serverTimestamp(),
  });
};

export const createStudentUserProfile = async (
  uid: string,
  payload: {
    fullName: string;
    email: string;
    role: 'student';
    studentId: string;
    studentNumber: string;
    teacherId: string | null;
    classIds: string[];
    status: 'active';
  },
) => {
  await setDoc(doc(db, 'users', uid), {
    ...payload,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};
