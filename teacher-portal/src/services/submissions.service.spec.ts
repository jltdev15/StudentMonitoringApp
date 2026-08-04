import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  doc: vi.fn((_db, collection: string, id: string) => ({collection, id})),
  serverTimestamp: vi.fn(() => 'server-time'),
  existing: {exists: false, data: {} as Record<string, unknown>},
  transactionSet: vi.fn(),
  runTransaction: vi.fn(async (_db, callback: (transaction: {get: (ref: unknown) => Promise<unknown>; set: (...args: unknown[]) => void}) => Promise<void>) => callback({
    get: vi.fn(async () => ({exists: () => mocks.existing.exists, data: () => mocks.existing.data})),
    set: mocks.transactionSet,
  })),
}));

vi.mock('../firebase', () => ({db: 'database'}));
vi.mock('../services', () => ({getStudentSubmissions: vi.fn(), getSubmissions: vi.fn(), saveScores: vi.fn()}));
vi.mock('firebase/firestore', () => ({doc: mocks.doc, runTransaction: mocks.runTransaction, serverTimestamp: mocks.serverTimestamp}));

import {submitStudentQuiz} from './submissions.service';

describe('quiz submission service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.existing.exists = false;
    mocks.existing.data = {};
  });

  it('marks a normal completion with the existing remarks', async () => {
    await submitStudentQuiz('activity-1', 'class-1', 'student-1', 20, {'0': 'A'});
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      {collection: 'activitySubmissions', id: 'activity-1_student-1'},
      expect.objectContaining({score: 20, answers: {'0': 'A'}, remarks: 'Auto-graded Quiz', createdAt: 'server-time'}),
      {merge: false},
    );
  });

  it('identifies a partial submission caused by an early exit', async () => {
    await submitStudentQuiz('activity-1', 'class-1', 'student-1', 8, {'0': 'B'}, 'exited-early');
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      {collection: 'activitySubmissions', id: 'activity-1_student-1'},
      expect.objectContaining({score: 8, answers: {'0': 'B'}, remarks: 'Auto-graded Quiz · Exited early'}),
      {merge: false},
    );
  });

  it('allows a missing placeholder to transition to a completed submission once', async () => {
    mocks.existing.exists = true;
    mocks.existing.data = {status: 'missing'};
    await submitStudentQuiz('activity-1', 'class-1', 'student-1', 18, {'0': 'A'});
    expect(mocks.transactionSet).toHaveBeenCalledWith(
      {collection: 'activitySubmissions', id: 'activity-1_student-1'},
      expect.objectContaining({status: 'submitted', score: 18}),
      {merge: true},
    );
  });

  it('rejects an attempt to overwrite a completed submission', async () => {
    mocks.existing.exists = true;
    mocks.existing.data = {status: 'submitted'};
    await expect(submitStudentQuiz('activity-1', 'class-1', 'student-1', 25, {'0': 'A'}))
      .rejects.toThrow('already been submitted');
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });
});
