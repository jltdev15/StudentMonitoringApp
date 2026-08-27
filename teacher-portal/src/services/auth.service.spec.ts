import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(), verifyPasswordResetCode: vi.fn(), confirmPasswordReset: vi.fn(), auth: {},
}));

vi.mock('firebase/auth', () => ({
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  verifyPasswordResetCode: mocks.verifyPasswordResetCode,
  confirmPasswordReset: mocks.confirmPasswordReset,
}));
vi.mock('../firebase', () => ({auth: mocks.auth}));
vi.mock('../services', () => ({getUserProfile: vi.fn(), createStudentUserProfile: vi.fn()}));

import {completePasswordReset, requestPasswordReset, verifyPasswordReset} from './auth.service';

describe('auth password reset service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normalizes email before requesting a reset', async () => {
    await requestPasswordReset('  Learner@School.edu ');
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(mocks.auth, 'learner@school.edu');
  });

  it('verifies and completes a reset with Firebase Auth', async () => {
    await verifyPasswordReset('valid-code');
    await completePasswordReset('valid-code', 'new-password');
    expect(mocks.verifyPasswordResetCode).toHaveBeenCalledWith(mocks.auth, 'valid-code');
    expect(mocks.confirmPasswordReset).toHaveBeenCalledWith(mocks.auth, 'valid-code', 'new-password');
  });
});
