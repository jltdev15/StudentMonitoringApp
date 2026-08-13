import type {ActivityRecord, SubmissionRecord} from '../types';

/** Returns the score label students may see for an activity. */
export function studentActivityScoreLabel(activity: Pick<ActivityRecord, 'totalPoints'>, submission?: Pick<SubmissionRecord, 'score' | 'status'> | null): string {
  if (typeof submission?.score === 'number' && Number.isFinite(submission.score)) {
    return `${submission.score} / ${activity.totalPoints} pts`;
  }
  if (submission?.status === 'submitted') return 'Not graded';
  return '';
}

export function hasRecordedStudentScore(submission?: Pick<SubmissionRecord, 'score'> | null): boolean {
  return typeof submission?.score === 'number' && Number.isFinite(submission.score);
}
