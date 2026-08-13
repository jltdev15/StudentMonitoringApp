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

export const getAttendance = async (classId: string, date: string) => {
  const result = await getDocs(query(collection(db, 'attendance'), where('classId', '==', classId), where('date', '==', date)));
  return result.docs.map(item => record<AttendanceRecord>(item));
};

export const saveAttendance = async (classId: string, date: string, teacherId: string, items: {studentId: string; status: AttendanceStatus; remarks: string}[]) => {
  const batch = writeBatch(db);
  items.forEach(item => {
    batch.set(doc(db, 'attendance', attendanceIdFor(classId, item.studentId, date)), {
      ...item,
      classId,
      date,
      recordedBy: teacherId,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, {merge: true});
  });
  const statusCounts = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
  batch.set(doc(db, 'attendanceSessions', `${classId}_${date}`), {
    classId,
    date,
    recordedBy: teacherId,
    presentCount: statusCounts.present || 0,
    totalCount: items.length,
    statusCounts,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, {merge: true});
  await batch.commit();
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
