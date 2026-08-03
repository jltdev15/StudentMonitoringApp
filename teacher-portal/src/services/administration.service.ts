import {httpsCallable} from 'firebase/functions';
import {functions} from '../firebase';

export {resetTeacherData} from '../services';

export type FeedBackfillTotals = {
  announcements: number;
  attendance: number;
  achievements: number;
  days: number;
};

const runFeedBackfill = httpsCallable<Record<string, never>, FeedBackfillTotals>(functions, 'backfillStudentFeed');

export const backfillStudentFeed = async () => (await runFeedBackfill({})).data;
