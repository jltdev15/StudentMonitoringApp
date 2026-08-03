import {doc, serverTimestamp, updateDoc} from 'firebase/firestore';
import {getDownloadURL, ref as storageRef, uploadBytes} from 'firebase/storage';
import {db, storage} from '../firebase';

export {archiveStudent, claimRosterStudent, findRosterStudent, getStudentRecordByUserId, getStudentsByClass, saveStudent, updateStudentProfile} from '../services';

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

export const studentProfilePhotoPath = (studentId: string) =>
  `student-profile-images/${studentId}/avatar`;

export async function uploadStudentProfilePhoto(studentId: string, image: File) {
  if (!image.type.startsWith('image/')) throw new Error('Please choose a valid image file.');
  if (image.size > MAX_PROFILE_PHOTO_BYTES) throw new Error('Profile photos must be 5 MB or smaller.');

  const target = storageRef(storage, studentProfilePhotoPath(studentId));
  await uploadBytes(target, image, {
    contentType: image.type,
    cacheControl: 'private,max-age=3600',
  });
  const photoUrl = await getDownloadURL(target);
  await updateDoc(doc(db, 'students', studentId), {photoUrl, updatedAt: serverTimestamp()});
  return photoUrl;
}
