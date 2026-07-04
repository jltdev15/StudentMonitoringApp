import {NavigatorScreenParams} from '@react-navigation/native';
import {
  ActivityRecord,
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
  ActivityDetails: {activity: ActivityRecord};
  ScoreEncoding: {activity: ActivityRecord};
  ActivityHistory: undefined;
  Reports: undefined;
  Announcements: undefined;
  Settings: undefined;
  AboutApp: undefined;
  HelpSupport: undefined;
};

export type TeacherTabParamList = {
  DashboardTab: NavigatorScreenParams<TeacherStackParamList>;
  AttendanceTab: NavigatorScreenParams<TeacherStackParamList>;
  ClassesTab: NavigatorScreenParams<TeacherStackParamList>;
  ActivitiesTab: NavigatorScreenParams<TeacherStackParamList>;
  MoreTab: NavigatorScreenParams<TeacherStackParamList>;
};

export type StudentStackParamList = {
  StudentHome: undefined;
  MyAttendance: undefined;
  MyActivities: undefined;
  MyScores: undefined;
  StudentAnnouncements: undefined;
  StudentProfile: undefined;
};

export type StudentWithAttendance = StudentRecord & {
  attendanceStatus?: string;
};
