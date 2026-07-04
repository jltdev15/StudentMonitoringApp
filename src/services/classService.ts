import {
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import {collections} from '../config/firebase';
import {ClassRecord} from '../types/models';
import {col, docRef, mapDoc, now} from './firestoreHelpers';

export type ClassInput = Omit<
  ClassRecord,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export const createClass = async (payload: ClassInput) => {
  const ref = docRef(collections.classes);
  await setDoc(ref, {
    ...payload,
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  });
  return ref.id;
};

export const updateClass = (classId: string, payload: Partial<ClassRecord>) =>
  updateDoc(docRef(collections.classes, classId), {...payload, updatedAt: now()});

export const archiveClass = (classId: string) =>
  updateClass(classId, {status: 'archived'});

export const getTeacherClasses = async (teacherId: string) => {
  const snapshot = await getDocs(
    query(
      col(collections.classes),
      where('teacherId', '==', teacherId),
      where('status', '==', 'active'),
    ),
  );
  return snapshot.docs.map(doc => mapDoc<ClassRecord>(doc));
};

export const getClassById = async (classId: string) => {
  const snapshot = await getDoc(docRef(collections.classes, classId));
  return snapshot.exists() ? mapDoc<ClassRecord>(snapshot) : null;
};
