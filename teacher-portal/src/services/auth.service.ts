import {confirmPasswordReset, sendPasswordResetEmail, verifyPasswordResetCode} from 'firebase/auth';
import {auth} from '../firebase';

export {getUserProfile, createStudentUserProfile} from '../services';

/** Sends Firebase's password-reset email without exposing account existence to callers. */
export const requestPasswordReset = (email: string) =>
  sendPasswordResetEmail(auth, email.trim().toLowerCase());

/** Validates a reset link before the portal lets a user choose a new password. */
export const verifyPasswordReset = (code: string) => verifyPasswordResetCode(auth, code);

/** Applies the new password for a previously verified reset link. */
export const completePasswordReset = (code: string, password: string) =>
  confirmPasswordReset(auth, code, password);
