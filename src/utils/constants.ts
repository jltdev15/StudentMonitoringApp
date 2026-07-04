import {AttendanceStatus, ActivitySubmissionStatus} from '../types/models';

export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  secondary: '#16A34A',
  warning: '#F97316',
  danger: '#DC2626',
  info: '#0EA5E9',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
};

export const attendanceStatuses: AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'excused',
];
export const submissionStatuses: ActivitySubmissionStatus[] = [
  'submitted',
  'missing',
  'late',
  'excused',
];

export const statusColors: Record<string, string> = {
  present: colors.secondary,
  submitted: colors.secondary,
  absent: colors.danger,
  missing: colors.danger,
  late: colors.warning,
  excused: colors.info,
  active: colors.secondary,
  inactive: colors.muted,
  closed: colors.muted,
  archived: colors.muted,
};
