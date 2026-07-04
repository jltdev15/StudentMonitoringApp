import {
  getDocs,
  query,
  setDoc,
  where,
} from '@react-native-firebase/firestore';
import {collections} from '../config/firebase';
import {AnnouncementRecord} from '../types/models';
import {col, docRef, mapDoc, now} from './firestoreHelpers';

export type AnnouncementInput = Omit<
  AnnouncementRecord,
  'id' | 'createdAt' | 'updatedAt'
>;

export const createAnnouncement = async (payload: AnnouncementInput) => {
  const ref = docRef(collections.announcements);
  await setDoc(ref, {...payload, createdAt: now(), updatedAt: now()});
  return ref.id;
};

export const getTeacherAnnouncements = async (teacherId: string) => {
  const snapshot = await getDocs(
    query(col(collections.announcements), where('postedBy', '==', teacherId)),
  );
  return snapshot.docs.map(doc => mapDoc<AnnouncementRecord>(doc));
};

export const getAnnouncementsForStudent = async (classIds: string[]) => {
  const general = await getDocs(
    query(
      col(collections.announcements),
      where('classId', '==', null),
      where('targetRole', 'in', ['all', 'students']),
    ),
  );

  const classAnnouncements = classIds.length
    ? await Promise.all(
        classIds
          .slice(0, 10)
          .map(classId =>
            getDocs(
              query(
                col(collections.announcements),
                where('classId', '==', classId),
                where('targetRole', 'in', ['all', 'students']),
              ),
            ),
          ),
      )
    : [];

  return [
    ...general.docs.map(doc => mapDoc<AnnouncementRecord>(doc)),
    ...classAnnouncements.flatMap(snapshot =>
      snapshot.docs.map(doc => mapDoc<AnnouncementRecord>(doc)),
    ),
  ];
};
