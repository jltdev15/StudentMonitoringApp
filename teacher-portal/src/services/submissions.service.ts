import {doc, runTransaction, serverTimestamp} from 'firebase/firestore';
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
  const submissionRef = doc(db, 'activitySubmissions', `${activityId}_${studentId}`);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(submissionRef);
    if (snapshot.exists() && snapshot.data().status !== 'missing') {
      throw new Error('This quiz has already been submitted and cannot be retaken.');
    }

    transaction.set(submissionRef, {
      activityId,
      classId,
      studentId,
      status: 'submitted',
      score,
      ...(answers ? {answers} : {}),
      remarks: reason === 'exited-early' ? 'Auto-graded Quiz · Exited early' : 'Auto-graded Quiz',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(!snapshot.exists() ? {createdAt: serverTimestamp()} : {}),
    }, {merge: snapshot.exists()});
  });
}
