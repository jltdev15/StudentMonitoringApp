import {
  deleteObject,
  getDownloadURL,
  getStorage,
  putFile,
  ref,
} from '@react-native-firebase/storage';
import {
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';
import {collections, db, firebaseApp} from '../config/firebase';
import {
  ActivityAttachment,
  ActivityRecord,
  ActivitySubmissionRecord,
  SubmissionDraft,
} from '../types/models';
import {col, docRef, mapDoc, now} from './firestoreHelpers';

export type ActivityInput = Omit<
  ActivityRecord,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export type SubmissionImage = {
  uri: string;
  fileName: string;
  contentType: string;
  fileSize?: number;
};

export const MAX_SUBMISSION_IMAGES = 5;
export const MAX_SUBMISSION_IMAGE_BYTES = 10 * 1024 * 1024;

const storageService = getStorage(firebaseApp);

const dueDateAsDate = (dueDate: ActivityRecord['dueDate']) => {
  if (!dueDate) {
    return null;
  }
  return 'toDate' in dueDate ? dueDate.toDate() : dueDate;
};

const fileExtension = (fileName: string, contentType: string) => {
  const fromName = fileName.split('.').pop();
  if (fromName && /^[a-zA-Z0-9]+$/.test(fromName)) {
    return fromName.toLowerCase();
  }
  return contentType === 'image/png' ? 'png' : 'jpg';
};

export const activityAttachmentPath = (
  activityId: string,
  studentId: string,
  attachmentId: string,
  extension: string,
) =>
  `activity-submissions/${activityId}/${studentId}/${attachmentId}.${extension}`;

const uploadSubmissionImage = async (
  activityId: string,
  studentId: string,
  image: SubmissionImage,
  order: number,
): Promise<ActivityAttachment> => {
  const attachmentId = `${Date.now()}-${order}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const extension = fileExtension(image.fileName, image.contentType);
  const storagePath = activityAttachmentPath(
    activityId,
    studentId,
    attachmentId,
    extension,
  );
  const storageRef = ref(storageService, storagePath);
  await putFile(storageRef, image.uri, {contentType: image.contentType});
  return {
    id: attachmentId,
    storagePath,
    downloadUrl: await getDownloadURL(storageRef),
    fileName: image.fileName,
    contentType: image.contentType,
    order,
  };
};

export const createActivity = async (payload: ActivityInput) => {
  const activityRef = docRef(collections.activities);
  await setDoc(activityRef, {
    ...payload,
    acceptsImageAttachments: payload.acceptsImageAttachments ?? false,
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  });
  return activityRef.id;
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
  updateDoc(docRef(collections.activities, activityId), {
    status: 'closed',
    closedAt: now(),
    updatedAt: now(),
  });

export const deleteActivity = async (activityId: string) => {
  const submissions = await getDocs(
    query(col(collections.submissions), where('activityId', '==', activityId)),
  );
  const refs = [
    docRef(collections.activities, activityId),
    ...submissions.docs.map(item => item.ref),
  ];

  const attachmentPaths = submissions.docs.flatMap(item => {
    const submission = mapDoc<ActivitySubmissionRecord>(item);
    return (submission.attachments || []).map(
      attachment => attachment.storagePath,
    );
  });

  await Promise.all(
    attachmentPaths.map(path =>
      deleteObject(ref(storageService, path)).catch(() => {}),
    ),
  );

  for (let index = 0; index < refs.length; index += 500) {
    const batch = writeBatch(db);
    refs.slice(index, index + 500).forEach(itemRef => batch.delete(itemRef));
    await batch.commit();
  }
};

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
    query(col(collections.submissions), where('activityId', '==', activityId)),
  );
  return snapshot.docs.map(doc => mapDoc<ActivitySubmissionRecord>(doc));
};

export const getSubmissionsByStudent = async (studentId: string) => {
  const snapshot = await getDocs(
    query(col(collections.submissions), where('studentId', '==', studentId)),
  );
  return snapshot.docs.map(doc => mapDoc<ActivitySubmissionRecord>(doc));
};

export const getActivitySubmission = async (
  activityId: string,
  studentId: string,
) => {
  const submissions = await getSubmissionsByStudent(studentId);
  return (
    submissions.find(submission => submission.activityId === activityId) || null
  );
};

export const submitImageActivity = async (
  activity: ActivityRecord,
  studentId: string,
  images: SubmissionImage[],
  onUploaded?: (uploaded: number, total: number) => void,
) => {
  if (!activity.acceptsImageAttachments) {
    throw new Error('This activity is not accepting image submissions.');
  }
  if (images.length > MAX_SUBMISSION_IMAGES) {
    throw new Error(`You can attach up to ${MAX_SUBMISSION_IMAGES} images.`);
  }
  if (
    images.some(
      image =>
        !image.contentType.startsWith('image/') ||
        (image.fileSize && image.fileSize > MAX_SUBMISSION_IMAGE_BYTES),
    )
  ) {
    throw new Error('Choose image files smaller than 10 MB.');
  }

  const previous = await getActivitySubmission(activity.id, studentId);
  if (typeof previous?.score === 'number') {
    throw new Error(
      'This submission has already been scored and can no longer be replaced.',
    );
  }
  const uploaded: ActivityAttachment[] = [];
  try {
    for (const [index, image] of images.entries()) {
      uploaded.push(
        await uploadSubmissionImage(activity.id, studentId, image, index),
      );
      onUploaded?.(index + 1, images.length);
    }

    const dueDate = dueDateAsDate(activity.dueDate);
    const status = dueDate && new Date() > dueDate ? 'late' : 'submitted';
    await setDoc(
      docRef(collections.submissions, submissionIdFor(activity.id, studentId)),
      {
        activityId: activity.id,
        classId: activity.classId,
        studentId,
        status,
        score: previous?.score ?? null,
        remarks: previous?.remarks ?? '',
        checkedBy: previous?.checkedBy ?? '',
        submittedAt: serverTimestamp(),
        attachments: uploaded,
        createdAt: previous?.createdAt ?? now(),
        updatedAt: now(),
      },
      {merge: true},
    );

    await Promise.all(
      (previous?.attachments || []).map(attachment =>
        deleteObject(ref(storageService, attachment.storagePath)).catch(
          () => {},
        ),
      ),
    );
    return {attachments: uploaded, status};
  } catch (error) {
    await Promise.all(
      uploaded.map(attachment =>
        deleteObject(ref(storageService, attachment.storagePath)).catch(
          () => {},
        ),
      ),
    );
    throw error;
  }
};

export const saveSubmissionBatch = async (
  activity: ActivityRecord,
  checkedBy: string,
  drafts: SubmissionDraft[],
) => {
  const batch = writeBatch(db);
  drafts.forEach(draft => {
    const id = submissionIdFor(activity.id, draft.studentId);
    const submissionRef = docRef(collections.submissions, id);
    batch.set(
      submissionRef,
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
