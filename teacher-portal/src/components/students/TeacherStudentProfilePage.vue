<script setup lang="ts">
import {computed} from 'vue';
import type {ActivityRecord, AttendanceRecord, AttendanceStatus, ClassRecord, StudentRecord, SubmissionRecord} from '../../types';

const props = defineProps<{
  student: StudentRecord;
  classRecord: ClassRecord;
  attendance: AttendanceRecord[];
  activities: ActivityRecord[];
  submissions: SubmissionRecord[];
  loading?: boolean;
}>();

defineEmits<{back: []}>();

const attendanceStatuses: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];
const attendanceTotals = computed(() => Object.fromEntries(attendanceStatuses.map(status => [
  status,
  props.attendance.filter(record => record.status === status).length,
])) as Record<AttendanceStatus, number>);
const attendanceHistory = computed(() => [...props.attendance].sort((a, b) => b.date.localeCompare(a.date)));
const submissionByActivity = computed(() => new Map(props.submissions.map(submission => [submission.activityId, submission])));
const scoreRows = computed(() => [...props.activities].sort((a, b) => {
  const aDate = a.dueDate instanceof Date ? a.dueDate.getTime() : a.dueDate?.toMillis() ?? 0;
  const bDate = b.dueDate instanceof Date ? b.dueDate.getTime() : b.dueDate?.toMillis() ?? 0;
  return bDate - aDate;
}).map(activity => ({activity, submission: submissionByActivity.value.get(activity.id)})));

function activityCategory(activity: ActivityRecord) {
  const category = activity.activityCategory || (activity.quizData ? 'quiz' : 'peta');
  return category === 'coding' ? 'Coding' : category === 'lecture' ? 'Lecture' : category === 'quiz' ? 'Quiz' : 'PETA';
}

function dueDate(activity: ActivityRecord) {
  if (!activity.dueDate) return 'No due date';
  const value = activity.dueDate instanceof Date ? activity.dueDate : activity.dueDate.toDate();
  return new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'}).format(value);
}
</script>

<template>
  <section class="teacher-student-profile" :aria-busy="loading">
    <div class="teacher-profile-heading">
      <button type="button" class="teacher-profile-back" @click="$emit('back')">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        Back
      </button>
      <div><p class="eyebrow">STUDENT PROFILE</p><h2>Student overview</h2><p>Identity, attendance, and activity results for this class.</p></div>
    </div>

    <article class="teacher-profile-hero">
      <div class="teacher-profile-avatar">
        <img v-if="student.photoUrl" :src="student.photoUrl" alt="Student profile photo" />
        <span v-else aria-hidden="true">{{ student.fullName.slice(0, 1).toUpperCase() }}</span>
      </div>
      <div class="teacher-profile-identity"><span class="tag active">Active student</span><h3>{{ student.fullName }}</h3><p>{{ student.studentNumber }}</p></div>
      <div class="teacher-profile-class"><small>CLASS</small><strong>{{ classRecord.className }}</strong><span>{{ classRecord.gradeLevel }} · {{ classRecord.section }} · {{ classRecord.subject }}</span></div>
    </article>

    <div class="teacher-profile-info-grid">
      <article class="panel teacher-profile-card"><div class="profile-card-heading"><span class="material-symbols-outlined" aria-hidden="true">badge</span><div><h3>Student information</h3><p>School identity and contact details.</p></div></div><dl><div><dt>Full name</dt><dd>{{ student.fullName }}</dd></div><div><dt>Student number</dt><dd>{{ student.studentNumber }}</dd></div><div><dt>Email address</dt><dd>{{ student.email || 'Not provided' }}</dd></div><div><dt>Contact number</dt><dd>{{ student.contactNumber || 'Not provided' }}</dd></div><div><dt>Date of birth</dt><dd>{{ student.dateOfBirth || 'Not provided' }}</dd></div><div><dt>Gender</dt><dd>{{ student.gender || 'Not provided' }}</dd></div></dl></article>
      <article class="panel teacher-profile-card"><div class="profile-card-heading"><span class="material-symbols-outlined" aria-hidden="true">family_restroom</span><div><h3>Guardian information</h3><p>Emergency contact on record.</p></div></div><dl><div><dt>Guardian name</dt><dd>{{ student.guardianName || 'Not provided' }}</dd></div><div><dt>Guardian contact</dt><dd>{{ student.guardianContact || 'Not provided' }}</dd></div></dl></article>
    </div>

    <section class="teacher-profile-section" aria-labelledby="student-attendance-title">
      <div class="teacher-profile-section-heading"><div><h3 id="student-attendance-title">Attendance</h3><p>Recorded attendance for {{ classRecord.className }}.</p></div></div>
      <div class="teacher-profile-attendance-stats">
        <article v-for="status in attendanceStatuses" :key="status" :class="status"><strong>{{ attendanceTotals[status] }}</strong><span>{{ status }}</span></article>
      </div>
      <div v-if="attendanceHistory.length" class="panel teacher-profile-table-wrap"><table class="teacher-profile-table"><thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead><tbody><tr v-for="record in attendanceHistory" :key="record.id"><td>{{ record.date }}</td><td><span :class="['teacher-profile-status', record.status]">{{ record.status }}</span></td><td>{{ record.remarks || '—' }}</td></tr></tbody></table></div>
      <div v-else class="teacher-profile-empty">No attendance records for this class.</div>
    </section>

    <section class="teacher-profile-section" aria-labelledby="student-scores-title">
      <div class="teacher-profile-section-heading"><div><h3 id="student-scores-title">Activities &amp; scores</h3><p>Submission status and recorded scores for this class.</p></div></div>
      <div v-if="scoreRows.length" class="teacher-profile-score-list">
        <article v-for="row in scoreRows" :key="row.activity.id" class="panel teacher-profile-score-row">
          <div><span class="tag">{{ activityCategory(row.activity) }}</span><h4>{{ row.activity.title }}</h4><small>Due {{ dueDate(row.activity) }}</small></div>
          <span :class="['teacher-profile-status', row.submission?.status || 'missing']">{{ row.submission?.status || 'Missing' }}</span>
          <div class="teacher-profile-score"><strong>{{ row.submission?.score == null ? '—' : row.submission.score }}</strong><span>/ {{ row.activity.totalPoints }} pts</span></div>
        </article>
      </div>
      <div v-else class="teacher-profile-empty">No activities have been created for this class.</div>
    </section>
  </section>
</template>
