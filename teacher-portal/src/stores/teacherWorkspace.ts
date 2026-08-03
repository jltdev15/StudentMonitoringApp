import {defineStore} from 'pinia';
import {getActivities} from '../services/activities.service';
import {getAttendance} from '../services/attendance.service';
import {getTeacherClasses} from '../services/classes.service';
import {getStudentsByClass} from '../services/students.service';
import type {ActivityRecord, AttendanceRecord, ClassRecord, StudentRecord} from '../types';

export const useTeacherWorkspaceStore = defineStore('teacherWorkspace', {
  state: () => ({
    classes: [] as ClassRecord[],
    selectedClassId: '',
    students: [] as StudentRecord[],
    activities: [] as ActivityRecord[],
    attendance: [] as AttendanceRecord[],
    loading: false,
    error: '',
  }),
  getters: {
    selectedClass: state => state.classes.find(item => item.id === state.selectedClassId) ?? null,
  },
  actions: {
    selectClass(classId: string) {
      this.selectedClassId = this.classes.some(item => item.id === classId) ? classId : this.classes[0]?.id ?? '';
    },
    async load(teacherId: string, requestedClassId = '', date = new Date().toISOString().slice(0, 10)) {
      this.loading = true;
      this.error = '';
      try {
        this.classes = await getTeacherClasses(teacherId);
        this.selectClass(requestedClassId);
        if (!this.selectedClassId) {
          this.students = [];
          this.activities = [];
          this.attendance = [];
          return;
        }
        [this.students, this.activities, this.attendance] = await Promise.all([
          getStudentsByClass(this.selectedClassId),
          getActivities(this.selectedClassId),
          getAttendance(this.selectedClassId, date),
        ]);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not load the teacher workspace.';
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
