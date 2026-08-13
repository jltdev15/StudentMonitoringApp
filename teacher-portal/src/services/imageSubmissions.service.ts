import {deleteObject, getDownloadURL, ref, uploadBytes} from 'firebase/storage';
import {doc, serverTimestamp, setDoc} from 'firebase/firestore';
import {db, storage} from '../firebase';
import type {ActivityAttachment, ActivityRecord, SubmissionRecord} from '../types';

export const MAX_SUBMISSION_IMAGES = 5;
export const MAX_SUBMISSION_IMAGE_BYTES = 10 * 1024 * 1024;

const safeName = (name: string) => {
  const baseName = name.normalize('NFKD').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${baseName || 'output'}.webp`;
};

export async function submitStudentImageActivity(
  activity: ActivityRecord,
  studentId: string,
  files: File[],
  onUploaded?: (completed: number, total: number) => void,
  existingSubmission?: SubmissionRecord | null,
) {
  if (activity.status !== 'active' || activity.activityCategory === 'quiz' || activity.acceptsImageAttachments !== true) {
    throw new Error('This activity is not accepting image submissions.');
  }
  if (!files.length || files.length > MAX_SUBMISSION_IMAGES) throw new Error(`Choose between 1 and ${MAX_SUBMISSION_IMAGES} images.`);
  for (const file of files) {
    if (file.type !== 'image/webp' || !/\.webp$/i.test(file.name)) throw new Error(`${file.name} must be converted to WebP before upload.`);
    if (file.size > MAX_SUBMISSION_IMAGE_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
  }

  const submissionRef = doc(db, 'activitySubmissions', `${activity.id}_${studentId}`);
  if (existingSubmission?.score !== null && existingSubmission?.score !== undefined) {
    throw new Error('This output has already been scored and cannot be replaced.');
  }

  const uploaded: ActivityAttachment[] = [];
  const uploadedPaths: string[] = [];
  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const id = crypto.randomUUID();
      const fileName = safeName(file.name);
      const webpFile = file.name === fileName && file.type === 'image/webp'
        ? file
        : new File([file], fileName, {type: 'image/webp', lastModified: file.lastModified});
      const normalizedPath = `activity-submissions/${activity.id}/${studentId}/${id}-${fileName}`;
      const normalizedTarget = ref(storage, normalizedPath);
      uploadedPaths.push(normalizedPath);
      await uploadBytes(normalizedTarget, webpFile, {contentType: 'image/webp'});
      uploaded.push({id, storagePath: normalizedPath, downloadUrl: await getDownloadURL(normalizedTarget), fileName, contentType: 'image/webp', size: webpFile.size, order: index});
      onUploaded?.(index + 1, files.length);
    }

    const dueDate = activity.dueDate instanceof Date ? activity.dueDate : activity.dueDate && 'toDate' in activity.dueDate ? activity.dueDate.toDate() : activity.dueDate ? new Date(activity.dueDate) : null;
    const status = dueDate && Date.now() > dueDate.getTime() ? 'late' : 'submitted';
    // Do not read the submission document here. A first submission has no
    // document yet, and Firestore cannot authorize a read using fields that
    // do not exist. The rules authorize this direct create/update and reject
    // an update when the teacher has already recorded a score.
    if (existingSubmission) {
      await setDoc(submissionRef, {
        attachments: uploaded,
        status,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, {merge: true});
    } else {
      await setDoc(submissionRef, {
        activityId: activity.id,
        classId: activity.classId,
        studentId,
        status,
        attachments: uploaded,
        score: null,
        remarks: '',
        checkedBy: '',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }

    const oldAttachments = Array.isArray(existingSubmission?.attachments) ? existingSubmission.attachments : [];
    await Promise.all(oldAttachments.filter(item => item.storagePath).map(item => deleteObject(ref(storage, item.storagePath)).catch(() => undefined)));
    return uploaded;
  } catch (error) {
    await Promise.all(uploadedPaths.map(path => deleteObject(ref(storage, path)).catch(() => undefined)));
    throw error;
  }
}
