import {
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';
import {collections, db} from '../config/firebase';
import {
  ActivityRecord,
  ActivitySubmissionRecord,
  SubmissionDraft,
} from '../types/models';
import {col, docRef, mapDoc, now} from './firestoreHelpers';

export type ActivityInput = Omit<
  ActivityRecord,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export const createActivity = async (payload: ActivityInput) => {
  const ref = docRef(collections.activities);
  await setDoc(ref, {
    ...payload,
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  });
  return ref.id;
};

export const updateActivity = (
  activityId: string,
  payload: Partial<ActivityRecord>,
) =>
  updateDoc(docRef(collections.activities, activityId), {
    ...payload,
    updatedAt: now(),
  });

export const closeActivity = (activityId: string) =>
  updateActivity(activityId, {status: 'closed'});

export const getActivitiesByClass = async (classId: string) => {
  const snapshot = await getDocs(
    query(col(collections.activities), where('classId', '==', classId)),
  );
  return snapshot.docs.map(doc => mapDoc<ActivityRecord>(doc));
};

export const getActivitiesForClasses = async (classIds: string[]) => {
  if (classIds.length === 0) {
    return [];
  }
  const chunks = [];
  for (let index = 0; index < classIds.length; index += 10) {
    chunks.push(classIds.slice(index, index + 10));
  }
  const results = await Promise.all(
    chunks.map(chunk =>
      getDocs(
        query(col(collections.activities), where('classId', 'in', chunk)),
      ),
    ),
  );
  return results.flatMap(snapshot =>
    snapshot.docs.map(doc => mapDoc<ActivityRecord>(doc)),
  );
};

export const submissionIdFor = (activityId: string, studentId: string) =>
  `${activityId}_${studentId}`;

export const getSubmissionsByActivity = async (activityId: string) => {
  const snapshot = await getDocs(
    query(
      col(collections.submissions),
      where('activityId', '==', activityId),
    ),
  );
  return snapshot.docs.map(doc => mapDoc<ActivitySubmissionRecord>(doc));
};

export const getSubmissionsByStudent = async (studentId: string) => {
  const snapshot = await getDocs(
    query(
      col(collections.submissions),
      where('studentId', '==', studentId),
    ),
  );
  return snapshot.docs.map(doc => mapDoc<ActivitySubmissionRecord>(doc));
};

export const saveSubmissionBatch = async (
  activity: ActivityRecord,
  checkedBy: string,
  drafts: SubmissionDraft[],
) => {
  const batch = writeBatch(db);
  drafts.forEach(draft => {
    const id = submissionIdFor(activity.id, draft.studentId);
    const ref = docRef(collections.submissions, id);
    batch.set(
      ref,
      {
        activityId: activity.id,
        classId: activity.classId,
        studentId: draft.studentId,
        status: draft.status,
        score: draft.score,
        remarks: draft.remarks,
        checkedBy,
        submittedAt:
          draft.status === 'submitted' || draft.status === 'late'
            ? serverTimestamp()
            : null,
        createdAt: now(),
        updatedAt: now(),
      },
      {merge: true},
    );
  });
  await batch.commit();
};
