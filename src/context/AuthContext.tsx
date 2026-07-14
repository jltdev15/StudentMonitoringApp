import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  FirebaseAuthTypes,
  onAuthStateChanged,
} from '@react-native-firebase/auth';
import {firebaseAuth} from '../config/firebase';
import {
  createStudentUserProfile,
  deleteCurrentUser,
  findAndMigrateUserProfile,
  getUserProfile,
  loginWithEmail,
  logout as logoutService,
  registerWithEmail,
  sendEmailVerification,
} from '../services/authService';
import {
  claimRosterStudent,
  getStudentById,
  findRosterStudent,
  getStudentByUserId,
} from '../services/studentService';
import {StudentRecord, UserProfile} from '../types/models';

type AuthContextValue = {
  firebaseUser: FirebaseAuthTypes.User | null;
  profile: UserProfile | null;
  student: StudentRecord | null;
  initializing: boolean;
  profileLoading: boolean;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  registerStudent: (
    email: string,
    password: string,
    studentId: string,
    fullName: string,
    studentNumber: string,
  ) => Promise<void>;
  resendVerification: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({children}: PropsWithChildren) => {
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (user: FirebaseAuthTypes.User | null) => {
      if (!user) {
        setProfile(null);
        setStudent(null);
        return;
      }
      let nextProfile = null;
      try {
        nextProfile = await getUserProfile(user.uid);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        throw new Error('getUserProfile failed: ' + (err instanceof Error ? err.message : String(err)));
      }

      // If no profile was found by UID, try to find one by email and migrate it.
      // This handles cases where a teacher's Firestore doc ID doesn't match their Auth UID.
      if (!nextProfile && user.email) {
        try {
          nextProfile = await findAndMigrateUserProfile(user.uid, user.email);
          if (nextProfile) {
            console.log('Successfully migrated user profile for:', user.email);
          }
        } catch (err) {
          console.warn('Profile migration attempt failed:', err);
        }
      }
      
      setProfile(nextProfile);
      
      if (nextProfile?.role === 'student') {
        let nextStudent = null;
        if (nextProfile.studentId) {
          try {
            nextStudent = await getStudentById(nextProfile.studentId);
          } catch (err) {
            console.error('Error fetching student by ID:', err);
            throw new Error('getStudentById failed: ' + (err instanceof Error ? err.message : String(err)));
          }
        } else {
          try {
            nextStudent = await getStudentByUserId(user.uid);
          } catch (err) {
            console.error('Error fetching student by user ID:', err);
            throw new Error('getStudentByUserId failed: ' + (err instanceof Error ? err.message : String(err)));
          }
        }
        setStudent(nextStudent);
      } else {
        setStudent(null);
      }
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async user => {
      setProfileLoading(true);
      setFirebaseUser(user);
      // We don't wipe authError here because it clobbers errors thrown by registerStudent.
      try {
        await loadProfile(user);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // If profile loading fails with permission-denied on startup,
        // the cached auth session is stale/broken. Sign out to clear it
        // so the user can log in fresh instead of being stuck on an error.
        if (errorMsg.includes('permission-denied') && user) {
          console.warn('Stale auth session detected. Signing out to clear it.');
          try {
            await logoutService();
          } catch {
            // Ignore logout errors
          }
          setFirebaseUser(null);
          setProfile(null);
          setStudent(null);
          setAuthError(null);
        } else {
          setAuthError(
            error instanceof Error
              ? `Profile error: ${error.message}`
              : 'We could not load your account role. Please try again.'
          );
        }
      } finally {
        setProfileLoading(false);
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setAuthError(null);
      try {
        const credential = await loginWithEmail(email, password);

        // Load profile first so we know the user's role
        let userProfile: UserProfile | null = null;
        setProfileLoading(true);
        try {
          await loadProfile(credential.user);
          userProfile = await getUserProfile(credential.user.uid);
          // If not found by UID, try email-based migration
          if (!userProfile && credential.user.email) {
            userProfile = await findAndMigrateUserProfile(
              credential.user.uid,
              credential.user.email,
            );
          }
        } catch (profileErr) {
          console.warn('Initial profile load failed, retrying...', profileErr);
          await new Promise(resolve => setTimeout(resolve, 500));
          await loadProfile(credential.user);
          userProfile = await getUserProfile(credential.user.uid);
        }

        // Only enforce email verification for students, not teachers
        const isStudentRole = userProfile?.role === 'student';
        if (isStudentRole && !credential.user.emailVerified) {
          await logoutService();
          throw new Error('Please verify your email address before logging in.');
        }
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Login failed. Check your email and password.',
        );
        throw error;
      } finally {
        setProfileLoading(false);
        setLoading(false);
      }
    },
    [loadProfile],
  );

  const registerStudent = useCallback(
    async (email: string, password: string, studentId: string, fullName: string, studentNumber: string) => {
      setLoading(true);
      setAuthError(null);
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const credential = await registerWithEmail(normalizedEmail, password);
        
        await sendEmailVerification();

        const rosterStudent = await getStudentById(studentId);
        if (!rosterStudent) {
           throw new Error('Student record not found.');
        }

        await createStudentUserProfile({
          uid: credential.user.uid,
          fullName: fullName,
          email: normalizedEmail,
          role: 'student',
          studentId: studentId,
          studentNumber: studentNumber,
          teacherId: null,
          classIds: rosterStudent.classIds,
          status: 'active',
        });
        await claimRosterStudent(studentId, credential.user.uid, normalizedEmail);
        
        // Immediately sign out to force email verification
        await logoutService();
        setProfile(null);
        setStudent(null);
      } catch (error) {
        console.error("registerStudent failed:", error);
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Registration failed. Please check your roster details.',
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadProfile],
  );

  const resendVerification = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const credential = await loginWithEmail(email, password);
      await sendEmailVerification();
      await logoutService();
    } catch (error) {
      setAuthError('Could not resend email. Please check your credentials.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await logoutService();
      setProfile(null);
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      await loadProfile(firebaseUser);
    } finally {
      setProfileLoading(false);
    }
  }, [firebaseUser, loadProfile]);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      student,
      initializing,
      profileLoading,
      loading,
      authError,
      signIn,
      registerStudent,
      resendVerification,
      signOut,
      refreshProfile,
    }),
    [
      authError,
      firebaseUser,
      initializing,
      loading,
      profileLoading,
      profile,
      registerStudent,
      resendVerification,
      refreshProfile,
      signIn,
      signOut,
      student,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
};
