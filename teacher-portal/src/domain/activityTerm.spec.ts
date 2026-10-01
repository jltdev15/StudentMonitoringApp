import {describe, expect, it} from 'vitest';
import {ACTIVITY_TERMS, activityTermLabel, matchesActivityTermFilter, normalizeActivityTerm} from './activityTerm';

describe('activityTerm', () => {
  it('labels each term and legacy records without one', () => {
    expect(activityTermLabel({term: 'first'})).toBe('First term');
    expect(activityTermLabel({term: 'second'})).toBe('Second term');
    expect(activityTermLabel({term: 'third'})).toBe('Third term');
    expect(activityTermLabel({})).toBe('Unassigned');
  });

  it('normalizes raw input to a valid term or empty', () => {
    expect(normalizeActivityTerm('second')).toBe('second');
    expect(normalizeActivityTerm('')).toBe('');
    expect(normalizeActivityTerm(undefined)).toBe('');
    expect(normalizeActivityTerm('fourth')).toBe('');
  });

  it('matches the selected term filter, hiding term-less records under a specific term', () => {
    expect(matchesActivityTermFilter({term: 'first'}, 'all')).toBe(true);
    expect(matchesActivityTermFilter({}, 'all')).toBe(true);
    expect(matchesActivityTermFilter({term: 'first'}, 'first')).toBe(true);
    expect(matchesActivityTermFilter({term: 'second'}, 'first')).toBe(false);
    expect(matchesActivityTermFilter({}, 'first')).toBe(false);
  });

  it('covers exactly the three school terms', () => {
    expect(ACTIVITY_TERMS).toEqual(['first', 'second', 'third']);
  });
});
