import {
  AttendanceRecord,
  ActivityRecord,
  ActivitySubmissionRecord,
} from '../types/models';

export const countByStatus = <T extends {status: string}>(items: T[]) =>
  items.reduce<Record<string, number>>((summary, item) => {
    summary[item.status] = (summary[item.status] || 0) + 1;
    return summary;
  }, {});

export const calculateAverageScore = (
  submissions: ActivitySubmissionRecord[],
  activities: ActivityRecord[],
) => {
  const activityById = Object.fromEntries(
    activities.map(activity => [activity.id, activity]),
  );
  const scored = submissions.filter(item => typeof item.score === 'number');
  const earned = scored.reduce((total, item) => total + (item.score || 0), 0);
  const possible = scored.reduce(
    (total, item) => total + (activityById[item.activityId]?.totalPoints || 0),
    0,
  );
  return possible === 0 ? 0 : Math.round((earned / possible) * 100);
};

export const summarizeAttendanceForStudent = (attendance: AttendanceRecord[]) =>
  countByStatus(attendance);

export const listMissingSubmissions = (
  submissions: ActivitySubmissionRecord[],
) => submissions.filter(item => item.status === 'missing');
