import {doc, serverTimestamp, updateDoc} from 'firebase/firestore';
import {db} from '../firebase';

export {closeActivity, getActivities, getStudentActivities, removeActivityMaterial, saveActivity, uploadActivityMaterials} from '../services';

export const updateActivityDueDate = (activityId: string, dueDate: Date) => updateDoc(doc(db, 'activities', activityId), {
  dueDate,
  updatedAt: serverTimestamp(),
});

export const reopenActivity = (activityId: string, dueDate: Date) => updateDoc(doc(db, 'activities', activityId), {
  status: 'active',
  dueDate,
  reopenedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  closedAt: null,
});
