import {describe, expect, it} from 'vitest';
import {hasRecordedStudentScore, studentActivityScoreLabel} from './studentActivityScore';

const activity = {totalPoints: 25};

describe('student activity score visibility', () => {
  it('shows a recorded score after grading', () => {
    expect(studentActivityScoreLabel(activity, {score: 22, status: 'submitted'})).toBe('22 / 25 pts');
    expect(hasRecordedStudentScore({score: 22})).toBe(true);
  });

  it('labels submitted work as not graded when no score exists', () => {
    expect(studentActivityScoreLabel(activity, {score: null, status: 'submitted'})).toBe('Not graded');
    expect(studentActivityScoreLabel(activity, {score: null, status: 'late'})).toBe('');
    expect(hasRecordedStudentScore({score: null})).toBe(false);
  });

  it('does not invent scores for missing or excused work', () => {
    expect(studentActivityScoreLabel(activity, {score: null, status: 'missing'})).toBe('');
    expect(studentActivityScoreLabel(activity, {score: null, status: 'excused'})).toBe('');
  });
});
