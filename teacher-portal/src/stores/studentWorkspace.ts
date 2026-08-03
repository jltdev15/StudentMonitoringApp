import {defineStore} from 'pinia';
import {getStudentActivities} from '../services/activities.service';
import {getStudentAnnouncements} from '../services/announcements.service';
import {getStudentAttendanceRecords} from '../services/attendance.service';
import {getClassesByIds} from '../services/classes.service';
import {getStudentRecordByUserId} from '../services/students.service';
import {getStudentSubmissions} from '../services/submissions.service';
import type {ActivityRecord, AnnouncementRecord, AttendanceRecord, ClassRecord, StudentRecord, SubmissionRecord} from '../types';

export const useStudentWorkspaceStore = defineStore('studentWorkspace', {
  state: () => ({
    student: null as StudentRecord | null,
    classes: [] as ClassRecord[],
    activities: [] as ActivityRecord[],
    submissions: [] as SubmissionRecord[],
    attendance: [] as AttendanceRecord[],
    announcements: [] as AnnouncementRecord[],
    loading: false,
    error: '',
  }),
  actions: {
    async load(userId: string) {
      this.loading = true;
      this.error = '';
      try {
        this.student = await getStudentRecordByUserId(userId);
        if (!this.student) {
          this.classes = []; this.activities = []; this.submissions = []; this.attendance = []; this.announcements = [];
          return;
        }
        this.classes = await getClassesByIds(this.student.classIds);
        const activeClassIds = this.classes.map(item => item.id);
        [this.activities, this.submissions, this.attendance, this.announcements] = await Promise.all([
          getStudentActivities(activeClassIds),
          getStudentSubmissions(this.student.id),
          getStudentAttendanceRecords(this.student.id),
          getStudentAnnouncements(activeClassIds),
        ]);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not load the student workspace.';
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
