import {
  arrayUnion,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import {collections} from '../config/firebase';
import {RecordStatus, StudentRecord} from '../types/models';
import {col, docRef, mapDoc, now} from './firestoreHelpers';

export type StudentInput = Omit<
  StudentRecord,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export type RosterImportRow = {
  studentNumber: string;
  fullName: string;
};

export type RosterImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeStudentNumber = (studentNumber: string) => studentNumber.trim();

export const createStudent = async (payload: StudentInput) => {
  const ref = docRef(collections.students);
  await setDoc(ref, {
    ...payload,
    studentNumber: normalizeStudentNumber(payload.studentNumber),
    fullName: payload.fullName.trim(),
    email: normalizeEmail(payload.email),
    contactNumber: payload.contactNumber.trim(),
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  });
  return ref.id;
};

export const updateStudent = (
  studentId: string,
  payload: Partial<StudentRecord>,
) =>
  updateDoc(docRef(collections.students, studentId), {
    ...payload,
    updatedAt: now(),
  });

export const archiveStudent = (studentId: string) =>
  updateStudent(studentId, {status: 'inactive'});

export const getStudentsByClass = async (classId: string) => {
  const snapshot = await getDocs(
    query(
      col(collections.students),
      where('classIds', 'array-contains', classId),
      where('status', '==', 'active'),
    ),
  );
  return snapshot.docs.map(doc => mapDoc<StudentRecord>(doc));
};

export const getStudentsByClassAndStatus = async (
  classId: string,
  status: RecordStatus,
) => {
  const snapshot = await getDocs(
    query(
      col(collections.students),
      where('classIds', 'array-contains', classId),
      where('status', '==', status),
    ),
  );
  return snapshot.docs.map(doc => mapDoc<StudentRecord>(doc));
};

export const getStudentByUserId = async (userId: string) => {
  const snapshot = await getDocs(
    query(col(collections.students), where('userId', '==', userId), limit(1)),
  );
  return snapshot.empty ? null : mapDoc<StudentRecord>(snapshot.docs[0]);
};

export const getStudentById = async (studentId: string) => {
  const snapshot = await getDoc(docRef(collections.students, studentId));
  return snapshot.exists() ? mapDoc<StudentRecord>(snapshot) : null;
};

export const findRosterStudent = async (studentNumber: string) => {
  const snapshot = await getDocs(
    query(
      col(collections.students),
      where('studentNumber', '==', normalizeStudentNumber(studentNumber)),
      where('status', '==', 'active'),
      where('userId', '==', null),
      limit(1),
    ),
  );
  return snapshot.empty ? null : mapDoc<StudentRecord>(snapshot.docs[0]);
};

const getExistingRosterStudent = async (studentNumber: string) => {
  const normalizedStudentNumber = normalizeStudentNumber(studentNumber);
  
  const snapshot = await getDocs(
    query(
      col(collections.students),
      where('studentNumber', '==', normalizedStudentNumber),
      limit(1),
    ),
  );
  
  return snapshot.empty ? null : mapDoc<StudentRecord>(snapshot.docs[0]);
};

export const importStudentRoster = async (
  classId: string,
  rows: RosterImportRow[],
): Promise<RosterImportResult> => {
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const studentNumber = normalizeStudentNumber(row.studentNumber);
    const fullName = row.fullName.trim();

    if (!studentNumber || !fullName) {
      errors.push(`Row ${rowNumber}: missing required student data.`);
      continue;
    }

    const existing = await getExistingRosterStudent(studentNumber);
    if (existing) {
      await updateDoc(docRef(collections.students, existing.id), {
        classIds: arrayUnion(classId),
        fullName: existing.fullName || fullName,
        updatedAt: now(),
      });
      updated += 1;
      continue;
    }

    await createStudent({
      userId: null,
      studentNumber,
      fullName,
      email: '',
      contactNumber: '',
      guardianName: '',
      guardianContact: '',
      classIds: [classId],
    });
    created += 1;
  }

  return {
    created,
    updated,
    skipped: errors.length,
    errors,
  };
};

export const claimRosterStudent = async (
  studentId: string,
  userId: string,
  email: string,
) => {
  await updateDoc(docRef(collections.students, studentId), {
    userId,
    email: email.trim().toLowerCase(),
    updatedAt: now(),
  });
};
