import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendEmailVerification as sendVerificationEmail,
} from '@react-native-firebase/auth';
import {getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, limit} from '@react-native-firebase/firestore';
import {firebaseAuth, collections} from '../config/firebase';
import {UserProfile} from '../types/models';
import {docRef, col, now} from './firestoreHelpers';

export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(firebaseAuth, email.trim(), password);

export const registerWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);

export const loginAnonymously = () => signInAnonymously(firebaseAuth);

export const sendEmailVerification = () => {
  if (firebaseAuth.currentUser) {
    return sendVerificationEmail(firebaseAuth.currentUser);
  }
  return Promise.resolve();
};

export const deleteCurrentUser = async () => {
  if (firebaseAuth.currentUser) {
    await deleteUser(firebaseAuth.currentUser);
  }
};

export const logout = () => signOut(firebaseAuth);

export const getUserProfile = async (uid: string) => {
  const snapshot = await getDoc(docRef(collections.users, uid));
  return snapshot.exists()
    ? ({uid: snapshot.id, ...snapshot.data()} as UserProfile)
    : null;
};

export const createStudentUserProfile = async (payload: UserProfile) => {
  await setDoc(docRef(collections.users, payload.uid), {
    fullName: payload.fullName,
    email: payload.email.trim().toLowerCase(),
    role: 'student',
    studentId: payload.studentId,
    studentNumber: payload.studentNumber,
    teacherId: null,
    classIds: payload.classIds,
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  });
};

/**
 * When a user logs in but no profile exists at /users/{authUID},
 * search for an existing profile document by email (e.g., a teacher
 * whose Firestore doc ID doesn't match their Auth UID).
 * If found, migrate it to the correct UID-keyed path, update all
 * related records (classes, students), and clean up the old doc.
 */
export const findAndMigrateUserProfile = async (
  uid: string,
  email: string,
): Promise<UserProfile | null> => {
  const normalizedEmail = email.trim().toLowerCase();
  const snapshot = await getDocs(
    query(
      col(collections.users),
      where('email', '==', normalizedEmail),
      limit(1),
    ),
  );

  if (snapshot.empty) {
    return null;
  }

  const oldDoc = snapshot.docs[0];
  const oldData = oldDoc.data();
  const oldUid = oldDoc.id;

  // If the document already has the correct ID, just return it
  if (oldUid === uid) {
    return {uid: oldUid, ...oldData} as UserProfile;
  }

  console.log(`Migrating user profile from ${oldUid} to ${uid}`);

  // Migrate: copy the profile to /users/{authUID}
  await setDoc(docRef(collections.users, uid), {
    ...oldData,
    email: normalizedEmail,
    updatedAt: now(),
  });

  // If this is a teacher, update teacherId in all their classes
  if (oldData.role === 'teacher') {
    try {
      const classesSnapshot = await getDocs(
        query(
          col(collections.classes),
          where('teacherId', '==', oldUid),
        ),
      );
      for (const classDoc of classesSnapshot.docs) {
        await updateDoc(docRef(collections.classes, classDoc.id), {
          teacherId: uid,
          updatedAt: now(),
        });
      }
      console.log(`Migrated ${classesSnapshot.size} classes to new teacherId`);
    } catch (err) {
      console.warn('Could not migrate classes:', err);
    }
  }

  // Clean up the old mismatched document
  try {
    await deleteDoc(docRef(collections.users, oldUid));
  } catch {
    // Non-critical: old doc may remain but won't cause issues
    console.warn('Could not delete old profile document:', oldUid);
  }

  return {uid, ...oldData} as UserProfile;
};
