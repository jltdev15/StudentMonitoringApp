import {
  addDoc,
  collection,
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
import {db} from './firebase';
import type {
  ActivityRecord,
  AnnouncementRecord,
  AttendanceRecord,
  AttendanceStatus,
  ClassRecord,
  StudentRecord,
  SubmissionRecord,
  SubmissionStatus,
  TeacherProfile,
} from './types';

const record = <T>(snapshot: QueryDocumentSnapshot<DocumentData>) =>
  ({id: snapshot.id, ...snapshot.data()}) as T;

export const getTeacherProfile = async (uid: string) => {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? ({uid, ...snapshot.data()} as TeacherProfile) : null;
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

export const closeActivity = (id: string) => updateDoc(doc(db, 'activities', id), {status: 'closed', updatedAt: serverTimestamp()});

export const getSubmissions = async (activityId: string) => {
  const result = await getDocs(query(collection(db, 'activitySubmissions'), where('activityId', '==', activityId)));
  return result.docs.map(item => record<SubmissionRecord>(item));
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
