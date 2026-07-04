import {
  getDocs,
  query,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';
import {collections, db} from '../config/firebase';
import {AttendanceDraft, AttendanceRecord} from '../types/models';
import {col, docRef, mapDoc, now} from './firestoreHelpers';

export const attendanceIdFor = (
  classId: string,
  studentId: string,
  date: string,
) => `${classId}_${studentId}_${date}`;

export const getAttendanceByClassAndDate = async (
  classId: string,
  date: string,
) => {
  const snapshot = await getDocs(
    query(
      col(collections.attendance),
      where('classId', '==', classId),
      where('date', '==', date),
    ),
  );
  return snapshot.docs.map(doc => mapDoc<AttendanceRecord>(doc));
};

export const saveAttendanceBatch = async (
  classId: string,
  date: string,
  recordedBy: string,
  drafts: AttendanceDraft[],
) => {
  const batch = writeBatch(db);
  drafts.forEach(draft => {
    const id = attendanceIdFor(classId, draft.studentId, date);
    const ref = docRef(collections.attendance, id);
    batch.set(
      ref,
      {
        classId,
        studentId: draft.studentId,
        date,
        status: draft.status,
        remarks: draft.remarks,
        recordedBy,
        createdAt: now(),
        updatedAt: now(),
      },
      {merge: true},
    );
  });
  await batch.commit();
};

export const getStudentAttendance = async (studentId: string) => {
  const snapshot = await getDocs(
    query(col(collections.attendance), where('studentId', '==', studentId)),
  );
  return snapshot.docs
    .map(doc => mapDoc<AttendanceRecord>(doc))
    .sort((a, b) => b.date.localeCompare(a.date));
};

export const getAttendanceByClassRange = async (
  classId: string,
  startDate: string,
  endDate: string,
) => {
  const snapshot = await getDocs(
    query(
      col(collections.attendance),
      where('classId', '==', classId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
    ),
  );
  return snapshot.docs.map(doc => mapDoc<AttendanceRecord>(doc));
};
