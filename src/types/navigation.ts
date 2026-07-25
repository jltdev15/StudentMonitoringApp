import {NavigatorScreenParams} from '@react-navigation/native';
import {
  ActivityRecord,
  AnnouncementRecord,
  AttendanceStatus,
  ClassRecord,
  StudentRecord,
} from './models';

export type AuthStackParamList = {
  Login: undefined;
  StudentVerification: undefined;
  Register: {studentId: string; fullName: string; studentNumber: string};
};

export type TeacherStackParamList = {
  AttendanceHome: undefined;
  MoreHome: undefined;
  TeacherHome: undefined;
  ClassList: undefined;
  AddClass: undefined;
  EditClass: {classItem: ClassRecord};
  ClassDetails: {classItem: ClassRecord};
  StudentList: {classId?: string} | undefined;
  AddStudent: {classId?: string} | undefined;
  ImportStudentRoster: {classId?: string} | undefined;
  TeacherStudentProfile: {student: StudentRecord};
  ArchivedStudents: undefined;
  Attendance: {classId?: string} | undefined;
  AttendanceHistory: {classId?: string} | undefined;
  DailyAttendance: undefined;
  AttendanceStatusList: {status: AttendanceStatus; title: string};
  ActivityHome: undefined;
  ActivityList: {classId?: string} | undefined;
  CreateActivity: {classId?: string} | undefined;
  EditActivity: {activity: ActivityRecord};
  ActivityDetails: {activity: ActivityRecord};
  ScoreEncoding: {activity: ActivityRecord};
  ActivityHistory: undefined;
  Reports: undefined;
  Announcements: undefined;
  AnnouncementHistory: undefined;
  EditAnnouncement: {announcement: AnnouncementRecord};
  Settings: undefined;
  AboutApp: undefined;
  HelpSupport: undefined;
};

export type TeacherTabParamList = {
  DashboardTab: NavigatorScreenParams<TeacherStackParamList>;
  StudentsTab: NavigatorScreenParams<TeacherStackParamList>;
  ClassesTab: NavigatorScreenParams<TeacherStackParamList>;
  ReportsTab: NavigatorScreenParams<TeacherStackParamList>;
  MoreTab: NavigatorScreenParams<TeacherStackParamList>;
};

export type StudentStackParamList = {
  StudentHome: undefined;
  MyAttendance: undefined;
  MyActivities: undefined;
  MyScores: undefined;
  StudentAnnouncements: undefined;
  StudentAnnouncementDetails: {announcement: AnnouncementRecord};
  StudentProfile: undefined;
  SubmitActivity: {activity: ActivityRecord};
};

export type StudentTabParamList = {
  DashboardTab: NavigatorScreenParams<StudentStackParamList>;
  AttendanceTab: NavigatorScreenParams<StudentStackParamList>;
  ActivitiesTab: NavigatorScreenParams<StudentStackParamList>;
  AnnouncementsTab: NavigatorScreenParams<StudentStackParamList>;
  ProfileTab: NavigatorScreenParams<StudentStackParamList>;
};

export type StudentWithAttendance = StudentRecord & {
  attendanceStatus?: string;
};
