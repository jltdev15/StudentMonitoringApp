<script setup lang="ts">
import {computed} from 'vue';
import {activityTermLabel} from '../../domain/activityTerm';
import type {ActivityRecord, AttendanceStatus, ClassRecord, StudentRecord} from '../../types';

const props = defineProps<{
  selectedClass?: ClassRecord | null;
  students: StudentRecord[];
  activities: ActivityRecord[];
  todaySummary: Partial<Record<AttendanceStatus, number>>;
  attendanceDate: string;
  unmarkedAttendanceCount: number;
  busy: boolean;
}>();

const emit = defineEmits<{
  (event: 'take-attendance'): void;
  (event: 'create-class'): void;
  (event: 'create-activity'): void;
  (event: 'add-student'): void;
  (event: 'post-announcement'): void;
  (event: 'go-activities'): void;
}>();

const hasClass = computed(() => Boolean(props.selectedClass));
const learnerCountLabel = computed(() => `${props.students.length} ${props.students.length === 1 ? 'learner' : 'learners'}`);
const classContext = computed(() => {
  const classRecord = props.selectedClass;
  if (!classRecord) return '';
  return [classRecord.subject || 'Subject not set', classRecord.gradeLevel || 'Grade not set', classRecord.section || 'Section not set'].join(' · ');
});
const activeActivities = computed(() => props.activities.filter(activity => activity.status === 'active').slice(0, 4));
const remainingUnmarkedCount = computed(() => Number.isFinite(props.unmarkedAttendanceCount) ? Math.max(props.unmarkedAttendanceCount, 0) : 0);
const attendanceDateLabel = computed(() => formatAttendanceDate(props.attendanceDate));
const attendanceState = computed(() => {
  if (!props.students.length) {
    return {
      tone: 'neutral',
      icon: 'group_add',
      title: 'No learners yet',
      detail: props.selectedClass ? `Add a learner to take attendance on ${attendanceDateLabel.value}.` : 'Create a class to add learners and begin tracking attendance.',
    };
  }
  if (!props.selectedClass) {
    return {
      tone: 'neutral',
      icon: 'event_busy',
      title: 'No class selected',
      detail: 'Choose a class to review its attendance status.',
    };
  }
  if (remainingUnmarkedCount.value) {
    const noun = remainingUnmarkedCount.value === 1 ? 'learner' : 'learners';
    const verb = remainingUnmarkedCount.value === 1 ? 'needs' : 'need';
    const unmarkedNote = remainingUnmarkedCount.value === 1
      ? 'The unmarked learner is not included in attendance totals.'
      : 'Unmarked learners are not included in attendance totals.';
    return {
      tone: 'warning',
      icon: 'pending_actions',
      title: 'Attendance incomplete',
      detail: `${remainingUnmarkedCount.value} ${noun} still ${verb} a status on ${attendanceDateLabel.value}. ${unmarkedNote}`,
    };
  }
  return {
    tone: 'complete',
    icon: 'check_circle',
    title: 'Attendance complete',
    detail: `All ${props.students.length} learners have a status on ${attendanceDateLabel.value}.`,
  };
});
const metricCards = computed(() => [
  {key: 'students', label: 'Students', value: props.students.length, icon: 'groups', tone: 'students'},
  {key: 'present', label: 'Present', value: props.todaySummary?.present ?? 0, icon: 'check_circle', tone: 'present'},
  {key: 'late', label: 'Late', value: props.todaySummary?.late ?? 0, icon: 'schedule', tone: 'late'},
  {key: 'absent', label: 'Absent', value: props.todaySummary?.absent ?? 0, icon: 'cancel', tone: 'absent'},
]);

function formatAttendanceDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value || 'No date selected';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {month: 'long', day: 'numeric', year: 'numeric'}).format(date);
}

function dateFromValue(value: ActivityRecord['dueDate'] | string | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    try {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    } catch {
      return null;
    }
  }
  return null;
}

function formatDueDate(value: ActivityRecord['dueDate']) {
  const date = dateFromValue(value);
  return date ? new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'}).format(date) : 'No due date';
}

function dueDateIso(value: ActivityRecord['dueDate']) {
  return dateFromValue(value)?.toISOString();
}

function dayBadge(value: ActivityRecord['dueDate']) {
  const date = dateFromValue(value);
  return date ? String(date.getDate()).padStart(2, '0') : '—';
}
</script>

<template>
  <section class="teacher-overview page" aria-labelledby="teacher-overview-title">
    <header class="overview-hero">
      <div class="overview-hero-copy">
        <p class="eyebrow">TEACHER OVERVIEW</p>
        <h2 id="teacher-overview-title">{{ props.selectedClass?.className || 'Your teaching workspace' }}</h2>
        <p v-if="props.selectedClass" class="overview-hero-summary"><span>{{ learnerCountLabel }} enrolled</span><span aria-hidden="true">•</span><span>{{ classContext }}</span></p>
        <p v-else class="overview-hero-summary">Create a class to manage learners, attendance, activities, and announcements in one place.</p>
        <button class="overview-hero-cta" type="button" :disabled="props.busy" @click="props.selectedClass ? emit('take-attendance') : emit('create-class')">
          <span>{{ props.selectedClass ? 'Take attendance' : 'Create your first class' }}</span><span aria-hidden="true">→</span>
        </button>
      </div>
      <div class="overview-hero-note">
        <span class="overview-note-label">CLASS SNAPSHOT</span>
        <strong>{{ props.selectedClass ? learnerCountLabel : 'No class selected' }}</strong>
        <p>{{ props.selectedClass ? classContext : 'Create a class to unlock your teacher tools.' }}</p>
      </div>
    </header>

    <section class="overview-attendance" aria-live="polite">
      <div class="attendance-state-copy">
        <span class="attendance-state-icon material-symbols-outlined" aria-hidden="true">{{ attendanceState.icon }}</span>
        <div>
          <p class="eyebrow">ATTENDANCE · {{ attendanceDateLabel }}</p>
          <h3>{{ attendanceState.title }}</h3>
          <p>{{ attendanceState.detail }}</p>
        </div>
      </div>
      <span :class="['attendance-state-badge', attendanceState.tone]">{{ attendanceState.tone === 'complete' ? 'Ready' : attendanceState.tone === 'warning' ? 'Action needed' : 'Setup' }}</span>
    </section>

    <section class="overview-metrics" aria-label="Class attendance metrics">
      <article v-for="metric in metricCards" :key="metric.key" :class="['overview-metric', metric.tone]" :data-metric="metric.key">
        <span class="overview-metric-icon material-symbols-outlined" aria-hidden="true">{{ metric.icon }}</span>
        <div><strong>{{ metric.value }}</strong><span>{{ metric.label }}<template v-if="metric.key !== 'students' && props.attendanceDate"> on {{ attendanceDateLabel }}</template></span></div>
      </article>
    </section>

    <div class="overview-content">
      <section class="overview-panel quick-actions-panel" aria-labelledby="teacher-overview-quick-actions">
        <div class="overview-panel-heading">
          <div><p class="eyebrow">WORKFLOW</p><h3 id="teacher-overview-quick-actions">Quick actions</h3></div>
          <span class="overview-panel-caption">Keep your class moving</span>
        </div>
        <div class="overview-action-list">
          <button class="overview-action" data-action="take-attendance" type="button" :disabled="!hasClass || props.busy" @click="emit('take-attendance')">
            <span class="overview-action-icon material-symbols-outlined" aria-hidden="true">fact_check</span><span>Take attendance</span><span class="overview-action-arrow" aria-hidden="true">→</span>
          </button>
          <button class="overview-action" data-action="create-activity" type="button" :disabled="!hasClass || props.busy" @click="emit('create-activity')">
            <span class="overview-action-icon material-symbols-outlined" aria-hidden="true">edit_square</span><span>Create activity</span><span class="overview-action-arrow" aria-hidden="true">→</span>
          </button>
          <button class="overview-action" data-action="add-student" type="button" :disabled="!hasClass || props.busy" @click="emit('add-student')">
            <span class="overview-action-icon material-symbols-outlined" aria-hidden="true">person_add</span><span>Add student</span><span class="overview-action-arrow" aria-hidden="true">→</span>
          </button>
          <button class="overview-action" data-action="post-announcement" type="button" :disabled="props.busy" @click="emit('post-announcement')">
            <span class="overview-action-icon material-symbols-outlined" aria-hidden="true">campaign</span><span>Post announcement</span><span class="overview-action-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section class="overview-panel activities-panel" aria-labelledby="teacher-overview-open-activities">
        <div class="overview-panel-heading">
          <div><p class="eyebrow">AT A GLANCE</p><h3 id="teacher-overview-open-activities">Open activities</h3></div>
          <button class="overview-view-all" type="button" @click="emit('go-activities')"><span>View all</span><span aria-hidden="true">→</span></button>
        </div>
        <ul v-if="activeActivities.length" class="overview-activity-list">
          <li v-for="activity in activeActivities" :key="activity.id" class="overview-activity-row">
            <span :class="['overview-day-badge', {empty: !dateFromValue(activity.dueDate)}]" :aria-label="dateFromValue(activity.dueDate) ? `Due day ${dayBadge(activity.dueDate)}` : 'No due date'">{{ dayBadge(activity.dueDate) }}</span>
            <div class="overview-activity-copy">
              <strong class="overview-activity-title">{{ activity.title }}</strong>
              <div class="overview-activity-meta">
                <time v-if="dateFromValue(activity.dueDate)" :datetime="dueDateIso(activity.dueDate)">Due {{ formatDueDate(activity.dueDate) }}</time>
                <span v-else>No due date</span>
                <span class="overview-term-label">{{ activityTermLabel(activity) }}</span>
              </div>
            </div>
            <span class="overview-activity-points">{{ activity.totalPoints }} pts</span>
          </li>
        </ul>
        <div v-else class="overview-empty-state">
          <span class="overview-empty-icon material-symbols-outlined" aria-hidden="true">assignment</span>
          <strong>{{ props.selectedClass ? 'No open activities yet' : 'Activities start with a class' }}</strong>
          <p>{{ props.selectedClass ? 'No open activities for this class. Create an activity to give learners a next task.' : 'Create your first class, then add an activity for your learners.' }}</p>
          <button v-if="props.selectedClass" class="overview-empty-action" type="button" :disabled="props.busy" @click="emit('create-activity')">Create activity <span aria-hidden="true">→</span></button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.teacher-overview { min-width: 0; display: grid; gap: 22px; }
.overview-hero { min-width: 0; position: relative; isolation: isolate; display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, .48fr); gap: 28px; align-items: center; min-height: 246px; overflow: hidden; padding: 32px 36px; color: #fff; border-radius: 20px; background: radial-gradient(circle at 88% 14%, rgba(126, 164, 255, .7), transparent 27%), linear-gradient(120deg, #192f78, #2c61d8 72%, #244eb4); box-shadow: 0 18px 36px rgba(31, 70, 166, .16); }
.overview-hero::before { content: ''; position: absolute; z-index: -1; width: 330px; height: 330px; right: 15%; bottom: -245px; border: 52px solid rgba(255, 255, 255, .1); border-radius: 50%; }
.overview-hero-copy, .overview-hero-note { min-width: 0; }
.overview-hero-copy { position: relative; }
.overview-hero .eyebrow { margin-bottom: 9px; color: #c8d7ff; }
.overview-hero h2 { max-width: 100%; margin: 0; overflow-wrap: anywhere; font: 800 clamp(26px, 3vw, 34px) Manrope; letter-spacing: -1.1px; line-height: 1.12; }
.overview-hero-summary { display: flex; flex-wrap: wrap; gap: 7px; margin: 13px 0 22px; color: #dce7ff; font-size: 14px; line-height: 1.5; }
.overview-hero-summary span { min-width: 0; overflow-wrap: anywhere; }
.overview-hero-cta { min-height: 44px; display: inline-flex; align-items: center; gap: 10px; padding: 0 17px; border: 0; border-radius: 10px; color: #214da8; background: #fff; box-shadow: 0 8px 18px rgba(15, 42, 111, .16); font-size: 13px; font-weight: 800; transition: transform .16s, box-shadow .16s, background .16s; }
.overview-hero-cta:hover:not(:disabled) { transform: translateY(-1px); background: #f5f8ff; box-shadow: 0 11px 22px rgba(15, 42, 111, .22); }
.overview-hero-cta:focus-visible, .overview-action:focus-visible, .overview-view-all:focus-visible, .overview-empty-action:focus-visible { outline: 3px solid #9dbbff; outline-offset: 3px; }
.overview-hero-cta:disabled, .overview-action:disabled, .overview-empty-action:disabled { cursor: not-allowed; opacity: .55; }
.overview-hero-note { position: relative; padding: 19px; border: 1px solid rgba(255, 255, 255, .22); border-radius: 15px; background: rgba(255, 255, 255, .1); }
.overview-note-label { display: block; color: #bcd0ff; font-size: 10px; font-weight: 800; letter-spacing: .13em; }
.overview-hero-note strong { display: block; margin-top: 10px; overflow-wrap: anywhere; font: 800 25px Manrope; letter-spacing: -.6px; }
.overview-hero-note p { margin: 6px 0 0; color: #dce7ff; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.overview-attendance { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px 21px; border: 1px solid #dfe6f2; border-radius: 15px; background: #fff; box-shadow: 0 6px 18px rgba(37, 59, 101, .04); }
.attendance-state-copy { min-width: 0; display: flex; align-items: flex-start; gap: 13px; }
.attendance-state-copy > div { min-width: 0; }
.attendance-state-icon { flex: 0 0 38px; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; color: #285bd6; background: #eaf0ff; font-size: 20px; }
.overview-attendance .eyebrow { margin-bottom: 5px; }
.overview-attendance h3 { margin: 0; color: #26334b; font: 800 16px Manrope; }
.overview-attendance p:not(.eyebrow) { margin: 4px 0 0; color: #78869a; font-size: 13px; line-height: 1.45; overflow-wrap: anywhere; }
.attendance-state-badge { flex: 0 0 auto; padding: 7px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; }
.attendance-state-badge.neutral { color: #5c6b82; background: #eef2f7; }
.attendance-state-badge.warning { color: #9b630d; background: #fff2d9; }
.attendance-state-badge.complete { color: #147346; background: #e4f7ec; }
.overview-metrics { min-width: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 15px; }
.overview-metric { min-width: 0; min-height: 103px; display: flex; align-items: center; gap: 13px; padding: 18px; border: 1px solid #e4e9f2; border-radius: 15px; background: #fff; box-shadow: 0 6px 18px rgba(37, 59, 101, .04); }
.overview-metric > div { min-width: 0; }
.overview-metric strong { display: block; color: #233149; font: 800 25px Manrope; letter-spacing: -.5px; }
.overview-metric span:not(.overview-metric-icon) { display: block; margin-top: 3px; color: #7c899e; font-size: 11px; line-height: 1.35; overflow-wrap: anywhere; }
.overview-metric-icon { flex: 0 0 39px; width: 39px; height: 39px; display: grid; place-items: center; border-radius: 11px; font-size: 19px; }
.overview-metric.students .overview-metric-icon { color: #285bd6; background: #eaf0ff; }
.overview-metric.present .overview-metric-icon { color: #16804a; background: #e5f7ec; }
.overview-metric.late .overview-metric-icon { color: #bd710f; background: #fff2dc; }
.overview-metric.absent .overview-metric-icon { color: #c23c4a; background: #ffedf0; }
.overview-content { min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.overview-panel { min-width: 0; padding: 22px; border: 1px solid #e3e9f2; border-radius: 16px; background: #fff; box-shadow: 0 8px 22px rgba(37, 59, 101, .045); }
.overview-panel-heading { min-width: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.overview-panel-heading > div { min-width: 0; }
.overview-panel .eyebrow { margin-bottom: 5px; }
.overview-panel h3 { margin: 0; color: #26334b; font: 800 17px Manrope; }
.overview-panel-caption { max-width: 130px; color: #8995a8; font-size: 11px; line-height: 1.4; text-align: right; }
.overview-action-list { min-width: 0; display: grid; gap: 9px; }
.overview-action { min-width: 0; min-height: 54px; display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 8px 11px; border: 1px solid #e5eaf2; border-radius: 11px; color: #40506a; background: #fff; text-align: left; font-size: 13px; font-weight: 750; transition: color .15s, border-color .15s, background .15s, transform .15s; }
.overview-action:hover:not(:disabled) { color: #285bd6; border-color: #b9ccf7; background: #f7faff; transform: translateY(-1px); }
.overview-action-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 9px; color: #285bd6; background: #edf3ff; font-size: 19px; }
.overview-action:nth-child(2) .overview-action-icon { color: #6a4bb6; background: #f1edff; }
.overview-action:nth-child(3) .overview-action-icon { color: #16804a; background: #e8f8ef; }
.overview-action:nth-child(4) .overview-action-icon { color: #bd710f; background: #fff3df; }
.overview-action-arrow { color: #9aa6b8; font-size: 18px; }
.overview-view-all { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px; min-height: 32px; padding: 0 3px 0 8px; border: 0; color: #285bd6; background: transparent; font-size: 12px; font-weight: 800; }
.overview-view-all:hover { text-decoration: underline; }
.overview-activity-list { min-width: 0; display: grid; margin: 0; padding: 0; list-style: none; }
.overview-activity-row { min-width: 0; display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 11px; padding: 12px 0; border-top: 1px solid #edf0f5; }
.overview-activity-row:first-child { padding-top: 0; border-top: 0; }
.overview-activity-row:last-child { padding-bottom: 0; }
.overview-day-badge { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; color: #285bd6; background: #eaf0ff; font-size: 12px; font-weight: 800; }
.overview-day-badge.empty { color: #8995a8; background: #f0f3f7; }
.overview-activity-copy { min-width: 0; }
.overview-activity-title { display: -webkit-box; overflow: hidden; color: #35435c; font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.overview-activity-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 9px; margin-top: 4px; color: #8995a8; font-size: 11px; line-height: 1.4; }
.overview-activity-meta time, .overview-term-label { color: #6f7e94; }
.overview-term-label { padding-left: 9px; border-left: 1px solid #dfe5ee; font-weight: 700; }
.overview-activity-points { color: #7a879a; font-size: 11px; font-weight: 800; text-align: right; white-space: nowrap; }
.overview-empty-state { min-height: 190px; display: grid; place-content: center; justify-items: center; padding: 20px 14px; color: #8491a5; text-align: center; }
.overview-empty-icon { width: 42px; height: 42px; display: grid; place-items: center; margin-bottom: 10px; border-radius: 12px; color: #285bd6; background: #eaf0ff; font-size: 21px; }
.overview-empty-state strong { color: #3b4960; font: 800 14px Manrope; }
.overview-empty-state p { max-width: 280px; margin: 6px 0 14px; font-size: 12px; line-height: 1.5; }
.overview-empty-action { min-height: 38px; padding: 0 12px; border: 1px solid #c3d3f4; border-radius: 9px; color: #285bd6; background: #f2f6ff; font-size: 12px; font-weight: 800; }
.overview-empty-action:hover:not(:disabled) { background: #e9f0ff; }
@media (max-width: 980px) {
  .overview-hero { grid-template-columns: minmax(0, 1fr) minmax(190px, .6fr); }
  .overview-content { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .teacher-overview { gap: 16px; }
  .overview-hero { grid-template-columns: 1fr; gap: 20px; min-height: 0; padding: 25px 22px 22px; border-radius: 16px; }
  .overview-hero-note { padding: 15px; }
  .overview-hero-note strong { font-size: 21px; }
  .overview-attendance { align-items: flex-start; padding: 16px; }
  .attendance-state-badge { margin-top: 2px; }
  .overview-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .overview-metric { min-height: 92px; gap: 10px; padding: 14px; }
  .overview-metric-icon { flex-basis: 34px; width: 34px; height: 34px; font-size: 17px; }
  .overview-metric strong { font-size: 22px; }
  .overview-panel { padding: 18px 16px; }
  .overview-panel-caption { display: none; }
}
@media (max-width: 420px) {
  .overview-hero { padding: 22px 17px 18px; }
  .overview-hero h2 { font-size: 25px; }
  .overview-attendance { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
  .attendance-state-copy { gap: 10px; }
  .attendance-state-icon { flex-basis: 34px; width: 34px; height: 34px; font-size: 18px; }
  .overview-metric { min-height: 86px; padding: 12px 10px; }
  .overview-metric-icon { display: none; }
  .overview-metric strong { font-size: 21px; }
  .overview-activity-row { grid-template-columns: 34px minmax(0, 1fr); gap: 9px; }
  .overview-day-badge { width: 34px; height: 34px; }
  .overview-activity-points { grid-column: 2; margin-top: -4px; text-align: left; }
}
</style>
