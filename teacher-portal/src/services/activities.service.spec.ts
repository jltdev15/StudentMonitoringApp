import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  doc: vi.fn((_db, collection: string, id: string) => ({collection, id})),
  serverTimestamp: vi.fn(() => 'server-time'),
  updateDoc: vi.fn(async () => undefined),
}));

vi.mock('../firebase', () => ({db: 'database'}));
vi.mock('../services', () => ({
  closeActivity: vi.fn(), getActivities: vi.fn(), getStudentActivities: vi.fn(),
  removeActivityMaterial: vi.fn(), saveActivity: vi.fn(), uploadActivityMaterials: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: mocks.doc,
  serverTimestamp: mocks.serverTimestamp,
  updateDoc: mocks.updateDoc,
}));

import {reopenActivity} from './activities.service';

describe('activity service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reopens a quiz with a new due date while clearing the previous closure', async () => {
    const dueDate = new Date('2026-08-10T23:59:59');
    await reopenActivity('quiz-1', dueDate);
    expect(mocks.updateDoc).toHaveBeenCalledWith(
      {collection: 'activities', id: 'quiz-1'},
      {
        status: 'active',
        dueDate,
        reopenedAt: 'server-time',
        updatedAt: 'server-time',
        closedAt: null,
      },
    );
  });
});
