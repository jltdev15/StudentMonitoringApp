import {doc, serverTimestamp, setDoc} from 'firebase/firestore';
import {db} from '../firebase';
import type {QuizAnswer} from '../types';

export {getStudentSubmissions, getSubmissions, saveScores} from '../services';

export type QuizSubmissionReason = 'completed' | 'exited-early';

export async function submitStudentQuiz(
  activityId: string,
  classId: string,
  studentId: string,
  score: number,
  answers?: Record<string, QuizAnswer>,
  reason: QuizSubmissionReason = 'completed',
) {
  await setDoc(doc(db, 'activitySubmissions', `${activityId}_${studentId}`), {
    activityId,
    classId,
    studentId,
    status: 'submitted',
    score,
    ...(answers ? {answers} : {}),
    remarks: reason === 'exited-early' ? 'Auto-graded Quiz · Exited early' : 'Auto-graded Quiz',
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, {merge: true});
}
