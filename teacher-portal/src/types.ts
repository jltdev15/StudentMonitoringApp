import type {Timestamp} from 'firebase/firestore';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type SubmissionStatus = 'submitted' | 'missing' | 'late' | 'excused';
export type ActivityCategory = 'peta' | 'quiz' | 'coding';
export type QuizAnswer = string | number | boolean | null;
export type QuizOptions = QuizAnswer[] | Record<string, QuizAnswer>;
export type QuizQuestion = {
  id?: string;
  question?: string;
  text?: string;
  options?: QuizOptions;
  choices?: QuizOptions;
  answer?: QuizAnswer;
  correctAnswer?: QuizAnswer;
  correct?: QuizAnswer;
  [key: string]: unknown;
};
export type QuizDocument = QuizQuestion[] | {
  questions?: QuizQuestion[];
  items?: QuizQuestion[];
  data?: QuizQuestion[];
  quiz?: QuizQuestion[];
  [key: string]: unknown;
};

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
  status: 'active' | 'archived' | 'deleted';
};

export type StudentRecord = {
  id: string;
  userId: string | null;
  studentNumber: string;
  fullName: string;
  email: string;
  contactNumber: string;
  dateOfBirth?: string;
  gender?: string;
  guardianName: string;
  guardianContact: string;
  photoUrl?: string;
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

export type ActivityMaterial = {
  id: string;
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  contentType: string;
  size: number;
  order: number;
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
  quizData?: QuizDocument;
  materials?: ActivityMaterial[];
  petaOutputs?: ActivityMaterial[];
  /** Legacy single-output field retained for existing activity records. */
  petaOutput?: ActivityMaterial | null;
  status: 'active' | 'closed';
  closedAt?: Timestamp | Date | null;
};

export type FeedPostType = 'achievement' | 'attendance' | 'announcement' | 'student';
export type StudentFeedPostPresetKey = 'ready_to_learn' | 'good_luck' | 'proud_of_class' | 'congratulations' | 'grateful';
export type FeedCommentKey = 'congratulations' | 'great_job' | 'well_done' | 'keep_it_up' | 'proud_of_you';
export type FeedAchiever = {
  name: string;
  score: number | null;
};
export type FeedPost = {
  id: string;
  type: FeedPostType;
  sourceId: string;
  title: string;
  body: string;
  authorId?: string;
  authorLabel?: string;
  authorPhotoUrl?: string;
  presetKey?: StudentFeedPostPresetKey;
  announcementType?: 'General' | 'Academic' | 'Events';
  classLabel?: string;
  schedule?: string;
  sessionDate?: string;
  presentCount?: number;
  activityTitle?: string;
  activityCategory?: ActivityCategory;
  totalPoints?: number;
  achieverResults?: FeedAchiever[];
  /** Legacy name-only list retained while older feed posts are refreshed. */
  achievers?: string[];
  achieverCount?: number;
  likeCount: number;
  commentCount: number;
  publishedAt?: Timestamp | Date | null;
};

export type FeedComment = {
  id: string;
  displayName: string;
  commentKey: FeedCommentKey;
  comment: string;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
};

export type SubmissionRecord = {
  id: string;
  activityId: string;
  classId: string;
  studentId: string;
  status: SubmissionStatus;
  score: number | null;
  answers?: Record<string, QuizAnswer>;
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
