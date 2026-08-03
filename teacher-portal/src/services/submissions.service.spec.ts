import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  doc: vi.fn((_db, collection: string, id: string) => ({collection, id})),
  serverTimestamp: vi.fn(() => 'server-time'),
  setDoc: vi.fn(async () => undefined),
}));

vi.mock('../firebase', () => ({db: 'database'}));
vi.mock('../services', () => ({getStudentSubmissions: vi.fn(), getSubmissions: vi.fn(), saveScores: vi.fn()}));
vi.mock('firebase/firestore', () => ({doc: mocks.doc, serverTimestamp: mocks.serverTimestamp, setDoc: mocks.setDoc}));

import {submitStudentQuiz} from './submissions.service';

describe('quiz submission service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks a normal completion with the existing remarks', async () => {
    await submitStudentQuiz('activity-1', 'class-1', 'student-1', 20, {'0': 'A'});
    expect(mocks.setDoc).toHaveBeenCalledWith(
      {collection: 'activitySubmissions', id: 'activity-1_student-1'},
      expect.objectContaining({score: 20, answers: {'0': 'A'}, remarks: 'Auto-graded Quiz'}),
      {merge: true},
    );
  });

  it('identifies a partial submission caused by an early exit', async () => {
    await submitStudentQuiz('activity-1', 'class-1', 'student-1', 8, {'0': 'B'}, 'exited-early');
    expect(mocks.setDoc).toHaveBeenCalledWith(
      {collection: 'activitySubmissions', id: 'activity-1_student-1'},
      expect.objectContaining({score: 8, answers: {'0': 'B'}, remarks: 'Auto-graded Quiz · Exited early'}),
      {merge: true},
    );
  });
});
