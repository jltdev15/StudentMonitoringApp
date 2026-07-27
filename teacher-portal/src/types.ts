import type {Timestamp} from 'firebase/firestore';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type SubmissionStatus = 'submitted' | 'missing' | 'late' | 'excused';
export type ActivityCategory = 'peta' | 'quiz' | 'coding';

export type UserProfile = {
  uid: string;
  fullName: string;
  email: string;
  role: 'teacher' | 'student';
  status: 'active' | 'inactive';
};

export type ClassRecord = {
  id: string;
  className: string;
  subject: string;
  gradeLevel: string;
  section: string;
  teacherId: string;
  schedule: string;
  status: 'active' | 'archived';
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
  status: 'active' | 'inactive';
};

export type AttendanceRecord = {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  remarks: string;
};

export type ActivityRecord = {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: Timestamp | Date | null;
  totalPoints: number;
  createdBy: string;
  activityCategory?: ActivityCategory;
  status: 'active' | 'closed';
};

export type SubmissionRecord = {
  id: string;
  activityId: string;
  classId: string;
  studentId: string;
  status: SubmissionStatus;
  score: number | null;
  remarks: string;
};

export type AnnouncementRecord = {
  id: string;
  classId: string | null;
  title: string;
  message: string;
  postedBy: string;
  targetRole: 'all' | 'students' | 'teachers';
  announcementType?: 'General' | 'Academic' | 'Events';
  featured?: boolean;
  createdAt?: Timestamp | Date | null;
};
