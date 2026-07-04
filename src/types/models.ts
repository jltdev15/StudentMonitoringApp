import type {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

export type UserRole = 'teacher' | 'student';
export type RecordStatus = 'active' | 'inactive';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type ActivitySubmissionStatus =
  | 'submitted'
  | 'missing'
  | 'late'
  | 'excused';
export type ClassStatus = 'active' | 'archived';
export type ActivityStatus = 'active' | 'closed';
export type AnnouncementTargetRole = 'all' | 'students' | 'teachers';
export type Timestamp = FirebaseFirestoreTypes.Timestamp | Date | null;

export type UserProfile = {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  studentId: string | null;
  studentNumber?: string;
  teacherId: string | null;
  classIds: string[];
  status: RecordStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type ClassRecord = {
  id: string;
  className: string;
  subject: string;
  gradeLevel: string;
  section: string;
  teacherId: string;
  schedule: string;
  status: ClassStatus;
  studentCount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type StudentRecord = {
  id: string;
  userId: string | null;
  studentNumber: string;
  fullName: string;
  email: string;
  contactNumber: string;
  guardianName: string;
  guardianContact: string;
  classIds: string[];
  status: RecordStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type AttendanceRecord = {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  remarks: string;
  recordedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type ActivityRecord = {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: Timestamp;
  totalPoints: number;
  createdBy: string;
  status: ActivityStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type ActivitySubmissionRecord = {
  id: string;
  activityId: string;
  classId: string;
  studentId: string;
  status: ActivitySubmissionStatus;
  score: number | null;
  remarks: string;
  checkedBy: string;
  submittedAt: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type AnnouncementRecord = {
  id: string;
  classId: string | null;
  title: string;
  message: string;
  postedBy: string;
  targetRole: AnnouncementTargetRole;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type AttendanceDraft = {
  studentId: string;
  status: AttendanceStatus | null;
  remarks: string;
};

export type SubmissionDraft = {
  studentId: string;
  status: ActivitySubmissionStatus;
  score: number | null;
  remarks: string;
};
