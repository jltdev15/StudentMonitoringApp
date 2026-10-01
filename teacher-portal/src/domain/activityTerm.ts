import type {ActivityRecord, ActivityTerm} from '../types';

export const ACTIVITY_TERMS: ActivityTerm[] = ['first', 'second', 'third'];

/** Human label for an activity term; legacy records without a term show as Unassigned. */
export function activityTermLabel(activity: Pick<ActivityRecord, 'term'>): string {
  return activity.term === 'first'
    ? 'First term'
    : activity.term === 'second'
      ? 'Second term'
      : activity.term === 'third'
        ? 'Third term'
        : 'Unassigned';
}

/** Normalize raw input (form state, legacy documents) to a valid term or empty. */
export function normalizeActivityTerm(value: unknown): ActivityTerm | '' {
  return value === 'first' || value === 'second' || value === 'third' ? value : '';
}

/** True when the activity passes the selected term filter; term-less records only match "all". */
export function matchesActivityTermFilter(activity: Pick<ActivityRecord, 'term'>, filter: 'all' | ActivityTerm): boolean {
  return filter === 'all' || (activity.term ?? '') === filter;
}
