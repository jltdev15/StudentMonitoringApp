<script setup lang="ts">
import {computed, onMounted, reactive, ref, watch} from 'vue';
import {onAuthStateChanged, signInWithEmailAndPassword, signOut, type User} from 'firebase/auth';
import {Timestamp} from 'firebase/firestore';
import classTrackSymbol from './assets/class-track-symbol.png';
import {auth, isFirebaseConfigured} from './firebase';
import {
  archiveStudent, closeActivity, getActivities, getAnnouncements, getAttendance,
  getSubmissions, getStudentsByClass, getTeacherClasses, getUserProfile,
  resetTeacherData, saveActivity, saveAnnouncement, saveAttendance, saveClass, saveScores, saveStudent, setAnnouncementFeatured,
  getStudentRecordByUserId, getClassesByIds, getStudentAttendanceRecords, getStudentSubmissions, getStudentActivities, getStudentAnnouncements
} from './services';
import type {ActivityCategory, ActivityRecord, AnnouncementRecord, AttendanceRecord, AttendanceStatus, ClassRecord, StudentRecord, SubmissionRecord, SubmissionStatus, UserProfile} from './types';

type View = 'dashboard' | 'classes' | 'students' | 'attendance' | 'activities' | 'announcements' | 'reports' | 'utilities';
type Modal = 'class' | 'student' | 'activity' | 'announcement' | 'scores' | 'reset' | null;

const currentUser = ref<User | null>(null);
const profile = ref<UserProfile | null>(null);
const view = ref<View>('dashboard');
const modal = ref<Modal>(null);
const busy = ref(false);
const loading = ref(true);
const message = ref('');
const error = ref('');
const email = ref('');
const password = ref('');
const classes = ref<ClassRecord[]>([]);
const selectedClassId = ref('');
const students = ref<StudentRecord[]>([]);
const activities = ref<ActivityRecord[]>([]);
const announcements = ref<Awaited<ReturnType<typeof getAnnouncements>>>([]);
const attendance = ref<Record<string, {status: AttendanceStatus; remarks: string}>>({});
const submissions = ref<Record<string, {status: SubmissionStatus; score: number | null; remarks: string}>>({});
const attendanceDate = ref(new Date().toISOString().slice(0, 10));
const selectedActivity = ref<ActivityRecord | null>(null);
const resetConfirmation = ref('');
const attendanceStatuses: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];
const navItems = computed(() => {
  if (profile.value?.role === 'student') {
    return [
      {id: 'dashboard', icon: '⌂', label: 'Overview'}, {id: 'classes', icon: '▦', label: 'My Classes'},
      {id: 'activities', icon: '◈', label: 'Activities & Scores'}, {id: 'attendance', icon: '✓', label: 'My Attendance'},
      {id: 'announcements', icon: '◉', label: 'Announcements'},
    ] as {id: View; icon: string; label: string}[];
  }
  return [
    {id: 'dashboard', icon: '⌂', label: 'Overview'}, {id: 'classes', icon: '▦', label: 'Classes'},
    {id: 'students', icon: '♙', label: 'Students'}, {id: 'attendance', icon: '✓', label: 'Attendance'},
    {id: 'activities', icon: '◈', label: 'Activities'}, {id: 'announcements', icon: '◉', label: 'Announcements'},
    {id: 'reports', icon: '▥', label: 'Reports'}, {id: 'utilities', icon: '⚙', label: 'Utilities'},
  ] as {id: View; icon: string; label: string}[];
});

// Student Data
const myStudentRecord = ref<StudentRecord | null>(null);
const myClasses = ref<ClassRecord[]>([]);
const myActivities = ref<ActivityRecord[]>([]);
const mySubmissions = ref<SubmissionRecord[]>([]);
const myAttendanceHistory = ref<AttendanceRecord[]>([]);
const myAnnouncements = ref<AnnouncementRecord[]>([]);

const classForm = reactive({className: '', subject: '', gradeLevel: '', section: '', schedule: ''});
const studentForm = reactive({studentNumber: '', fullName: '', email: '', contactNumber: '', guardianName: '', guardianContact: ''});
const activityForm = reactive({title: '', description: '', dueDate: '', totalPoints: 100, activityCategory: 'peta' as ActivityCategory});
const announcementForm = reactive({title: '', message: '', classId: '', targetRole: 'students' as 'all' | 'students' | 'teachers', announcementType: 'General' as 'General' | 'Academic' | 'Events'});

const selectedClass = computed(() => classes.value.find(item => item.id === selectedClassId.value) ?? null);
const activeActivities = computed(() => activities.value.filter(item => item.status === 'active'));
const todaySummary = computed(() => Object.values(attendance.value).reduce((summary, item) => {
  summary[item.status] = (summary[item.status] ?? 0) + 1;
  return summary;
}, {} as Record<AttendanceStatus, number>));
const studentById = computed(() => new Map(students.value.map(item => [item.id, item])));
const userName = computed(() => profile.value?.fullName?.split(' ')[0] || (profile.value?.role === 'student' ? 'Student' : 'Teacher'));
const todayLabel = new Intl.DateTimeFormat(undefined, {weekday: 'long', month: 'long', day: 'numeric'}).format(new Date());

function resetAlerts() { error.value = ''; message.value = ''; }
function showMessage(value: string) { error.value = ''; message.value = value; window.setTimeout(() => { if (message.value === value) message.value = ''; }, 3800); }
function showError(value: unknown) { message.value = ''; error.value = value instanceof Error ? value.message : 'Something went wrong. Please try again.'; }
function isoDate(value: ActivityRecord['dueDate']) {
  if (!value) return 'No due date';
  const date = value instanceof Date ? value : value.toDate();
  return new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'}).format(date);
}
function activityCategoryLabel(activity: ActivityRecord) {
  const category = activity.activityCategory || (/quiz/i.test(`${activity.title} ${activity.description}`) ? 'quiz' : 'peta');
  return category === 'coding' ? 'Coding' : category === 'quiz' ? 'Quiz' : 'PETA';
}

async function loadClasses() {
  if (!currentUser.value) return;
  classes.value = await getTeacherClasses(currentUser.value.uid);
  if (!selectedClassId.value || !classes.value.some(item => item.id === selectedClassId.value)) selectedClassId.value = classes.value[0]?.id ?? '';
}
async function loadClassData() {
  if (!selectedClassId.value) { students.value = []; activities.value = []; attendance.value = {}; return; }
  const [nextStudents, nextActivities, records] = await Promise.all([
    getStudentsByClass(selectedClassId.value), getActivities(selectedClassId.value), getAttendance(selectedClassId.value, attendanceDate.value),
  ]);
  students.value = nextStudents;
  activities.value = nextActivities.sort((a, b) => {
    const aTime = a.dueDate ? (a.dueDate instanceof Date ? a.dueDate.getTime() : a.dueDate.toMillis()) : 0;
    const bTime = b.dueDate ? (b.dueDate instanceof Date ? b.dueDate.getTime() : b.dueDate.toMillis()) : 0;
    return aTime - bTime;
  });
  attendance.value = Object.fromEntries(nextStudents.map(student => {
    const item = records.find(record => record.studentId === student.id);
    return [student.id, {status: item?.status ?? 'present', remarks: item?.remarks ?? ''}];
  }));
}
async function loadPortal() {
  if (!currentUser.value || !profile.value) return;
  busy.value = true;
  try {
    if (profile.value.role === 'teacher') {
      await loadClasses(); await loadClassData(); announcements.value = await getAnnouncements(currentUser.value.uid);
    } else if (profile.value.role === 'student') {
      myStudentRecord.value = await getStudentRecordByUserId(currentUser.value.uid);
      if (myStudentRecord.value) {
        myClasses.value = await getClassesByIds(myStudentRecord.value.classIds);
        myActivities.value = await getStudentActivities(myStudentRecord.value.classIds);
        mySubmissions.value = await getStudentSubmissions(myStudentRecord.value.id);
        myAttendanceHistory.value = await getStudentAttendanceRecords(myStudentRecord.value.id);
        myAnnouncements.value = await getStudentAnnouncements(myStudentRecord.value.classIds);
      } else {
        myClasses.value = []; myActivities.value = []; mySubmissions.value = []; myAttendanceHistory.value = []; myAnnouncements.value = [];
      }
    }
  }
  catch (value) { showError(value); }
  finally { busy.value = false; }
}
async function refreshClassData() {
  resetAlerts(); busy.value = true;
  try { await loadClassData(); } catch (value) { showError(value); } finally { busy.value = false; }
}

watch([selectedClassId, attendanceDate], () => { if (currentUser.value) refreshClassData(); });
onMounted(() => onAuthStateChanged(auth, async user => {
  currentUser.value = user;
  loading.value = true;
  resetAlerts();
  try {
    if (user) {
      const nextProfile = await getUserProfile(user.uid);
      if (!nextProfile || nextProfile.status !== 'active' || !['teacher', 'student'].includes(nextProfile.role)) {
        await signOut(auth);
        throw new Error('This account is not an active user account.');
      }
      profile.value = nextProfile;
      await loadPortal();
    } else profile.value = null;
  } catch (value) { showError(value); }
  finally { loading.value = false; }
}));

async function login() {
  resetAlerts(); busy.value = true;
  try { await signInWithEmailAndPassword(auth, email.value.trim(), password.value); }
  catch (value) { showError(value); }
  finally { busy.value = false; }
}
async function logout() { await signOut(auth); }
function openModal(type: Modal) { resetAlerts(); modal.value = type; }
function closeModal() { modal.value = null; selectedActivity.value = null; resetConfirmation.value = ''; }
function go(next: View) { view.value = next; }

async function submitClass() {
  if (!currentUser.value) return;
  busy.value = true;
  try {
    const id = await saveClass(currentUser.value.uid, {...classForm});
    await loadClasses(); selectedClassId.value = id; Object.assign(classForm, {className: '', subject: '', gradeLevel: '', section: '', schedule: ''}); closeModal(); showMessage('Class created successfully.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
async function submitStudent() {
  if (!selectedClassId.value) return;
  busy.value = true;
  try {
    await saveStudent({...studentForm, userId: null, classIds: [selectedClassId.value]});
    Object.assign(studentForm, {studentNumber: '', fullName: '', email: '', contactNumber: '', guardianName: '', guardianContact: ''}); await loadClassData(); closeModal(); showMessage('Student enrolled successfully.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
async function submitActivity() {
  if (!currentUser.value || !selectedClassId.value) return;
  busy.value = true;
  try {
    await saveActivity(currentUser.value.uid, {classId: selectedClassId.value, title: activityForm.title, description: activityForm.description, dueDate: activityForm.dueDate ? Timestamp.fromDate(new Date(`${activityForm.dueDate}T23:59:59`)) : null, totalPoints: Number(activityForm.totalPoints), activityCategory: activityForm.activityCategory});
    Object.assign(activityForm, {title: '', description: '', dueDate: '', totalPoints: 100, activityCategory: 'peta'}); await loadClassData(); closeModal(); showMessage('Activity created successfully.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
async function submitAnnouncement() {
  if (!currentUser.value) return;
  busy.value = true;
  try {
    await saveAnnouncement(currentUser.value.uid, {title: announcementForm.title, message: announcementForm.message, classId: announcementForm.classId || null, targetRole: announcementForm.targetRole, announcementType: announcementForm.announcementType});
    Object.assign(announcementForm, {title: '', message: '', classId: '', targetRole: 'students', announcementType: 'General'}); announcements.value = await getAnnouncements(currentUser.value.uid); closeModal(); showMessage('Announcement published.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
function setAttendance(studentId: string, status: AttendanceStatus) { attendance.value[studentId] = {...attendance.value[studentId], status, remarks: attendance.value[studentId]?.remarks ?? ''}; }
async function submitAttendance() {
  if (!currentUser.value || !selectedClassId.value) return;
  busy.value = true;
  try {
    const items = students.value.map(student => ({studentId: student.id, status: attendance.value[student.id]?.status ?? 'present', remarks: attendance.value[student.id]?.remarks ?? ''}));
    await saveAttendance(selectedClassId.value, attendanceDate.value, currentUser.value.uid, items); await loadClassData(); showMessage('Attendance saved.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
async function openScores(activity: ActivityRecord) {
  selectedActivity.value = activity; busy.value = true; resetAlerts();
  try {
    const current = await getSubmissions(activity.id);
    submissions.value = Object.fromEntries(students.value.map(student => {
      const item = current.find(submission => submission.studentId === student.id);
      return [student.id, {status: item?.status ?? 'missing', score: item?.score ?? null, remarks: item?.remarks ?? ''}];
    })); modal.value = 'scores';
  } catch (value) { showError(value); } finally { busy.value = false; }
}
async function submitScores() {
  if (!selectedActivity.value || !currentUser.value) return;
  busy.value = true;
  try {
    await saveScores(selectedActivity.value, currentUser.value.uid, students.value.map(student => ({studentId: student.id, status: submissions.value[student.id]?.status ?? 'missing', score: submissions.value[student.id]?.score ?? null, remarks: submissions.value[student.id]?.remarks ?? ''})));
    closeModal(); showMessage('Scores saved.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
async function archive(id: string) { if (window.confirm('Archive this student? They will no longer appear in active class lists.')) { busy.value = true; try { await archiveStudent(id); await loadClassData(); showMessage('Student archived.'); } catch (value) { showError(value); } finally { busy.value = false; } } }
async function close(id: string) { if (window.confirm('Close this activity? Students will no longer be able to submit it.')) { busy.value = true; try { await closeActivity(id); await loadClassData(); showMessage('Activity closed.'); } catch (value) { showError(value); } finally { busy.value = false; } } }
async function toggleFeatured(announcementId: string, featured: boolean) {
  busy.value = true;
  try {
    await setAnnouncementFeatured(announcementId, featured);
    announcements.value = await getAnnouncements(currentUser.value!.uid);
    showMessage(featured ? 'Announcement marked as featured.' : 'Featured tag removed.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
async function resetData() {
  if (resetConfirmation.value !== 'RESET') return;
  busy.value = true;
  try {
    const totals = await resetTeacherData(currentUser.value!.uid);
    await loadPortal();
    closeModal();
    showMessage(`Reset complete: ${totals.attendance} attendance records, ${totals.activities} activities, ${totals.activitySubmissions} submissions, and ${totals.announcements} announcements deleted.`);
  } catch (value) { showError(value); } finally { busy.value = false; }
}
</script>

<template>
  <main v-if="!loading && !profile" class="login-shell">
    <section class="login-intro"><div class="brand-mark"><img :src="classTrackSymbol" alt="ClassTrack" /></div><p class="eyebrow">CLASS TRACK</p><h1>Learning, in step together.</h1><p>Access your classes, attendance, activities, scores, and announcements from one connected workspace.</p><div class="feature-list"><span>✓ Live class records</span><span>✓ Shared mobile data</span><span>✓ Unified access</span></div></section>
    <form class="login-card" @submit.prevent="login"><div><p class="eyebrow">WEB PORTAL</p><h2>Welcome back</h2><p>Sign in with your existing account.</p></div><label>Email<input v-model="email" required type="email" autocomplete="email" placeholder="name@school.edu" /></label><label>Password<input v-model="password" required type="password" autocomplete="current-password" placeholder="••••••••" /></label><p v-if="error" class="alert error">{{ error }}</p><p v-if="!isFirebaseConfigured" class="alert error">Add your Firebase web app values to <code>.env</code> before signing in.</p><button class="primary full" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button></form>
  </main>
  <main v-else-if="loading" class="loading-page"><div class="spinner"></div><p>Opening your workspace…</p></main>
  <main v-else class="app-shell">
    <aside class="sidebar"><div class="brand"><div class="brand-mark"><img :src="classTrackSymbol" alt="ClassTrack" /></div><span>ClassTrack</span></div><nav><button v-for="item in navItems" :key="item.id" :class="{active:view === item.id}" @click="go(item.id)"><i>{{ item.icon }}</i>{{ item.label }}</button></nav><div class="account"><div class="avatar">{{ profile?.fullName?.slice(0, 1).toUpperCase() || 'U' }}</div><div><strong>{{ profile?.fullName || 'User' }}</strong><small>{{ profile?.role === 'student' ? 'Student' : 'Teacher' }}</small></div><button class="icon-button" title="Sign out" @click="logout">↪</button></div></aside>
    <section class="workspace"><header><div><p class="eyebrow">{{ todayLabel }}</p><h1>{{ view === 'dashboard' ? `Good day, ${userName}` : view[0].toUpperCase() + view.slice(1) }}</h1></div><div class="header-actions"><select v-if="view !== 'classes' && classes.length" v-model="selectedClassId" aria-label="Select class"><option v-for="item in classes" :key="item.id" :value="item.id">{{ item.className }} · {{ item.section }}</option></select><button class="icon-button" title="Refresh" @click="loadPortal">↻</button></div></header>
      <div v-if="error" class="alert error">{{ error }}</div><div v-if="message" class="alert success">{{ message }}</div>
      <template v-if="profile?.role === 'teacher'">
      <section v-if="view === 'dashboard'" class="page"><div class="hero-card"><div><p class="eyebrow">TODAY'S PULSE</p><h2>{{ selectedClass ? selectedClass.className : 'Start your class workspace' }}</h2><p>{{ selectedClass ? `${students.length} enrolled learners · ${todayLabel}` : 'Create a class to start managing student records.' }}</p><button class="light-button" @click="go('attendance')">Take attendance <span>→</span></button></div><div class="hero-orb">{{ todaySummary.present || 0 }}<small>present</small></div></div><div class="stat-grid"><article><span class="stat-icon blue">♙</span><div><strong>{{ students.length }}</strong><small>Students</small></div></article><article><span class="stat-icon green">✓</span><div><strong>{{ todaySummary.present || 0 }}</strong><small>Present today</small></div></article><article><span class="stat-icon orange">◷</span><div><strong>{{ todaySummary.late || 0 }}</strong><small>Late today</small></div></article><article><span class="stat-icon red">—</span><div><strong>{{ todaySummary.absent || 0 }}</strong><small>Absent today</small></div></article></div><div class="section-grid"><article class="panel"><div class="panel-title"><h3>Quick actions</h3></div><div class="quick-grid"><button @click="go('attendance')"><b>✓</b>Take attendance</button><button @click="openModal('activity')"><b>＋</b>Create activity</button><button @click="openModal('student')"><b>♙</b>Add student</button><button @click="openModal('announcement')"><b>◉</b>Post announcement</button></div></article><article class="panel"><div class="panel-title"><h3>Upcoming activities</h3><button class="text-button" @click="go('activities')">View all</button></div><div v-if="activeActivities.length" class="compact-list"><div v-for="item in activeActivities.slice(0, 4)" :key="item.id"><span class="date-square">{{ isoDate(item.dueDate).split(' ')[1] || '—' }}</span><div><strong>{{ item.title }}</strong><small>Due {{ isoDate(item.dueDate) }}</small></div><b>{{ item.totalPoints }} pts</b></div></div><p v-else class="empty-copy">No open activities for this class.</p></article></div></section>
      <section v-else-if="view === 'classes'" class="page"><div class="page-heading"><div><h2>Your classes</h2><p>Organize the subjects and sections you teach.</p></div><button class="primary" @click="openModal('class')">＋ Add class</button></div><div v-if="classes.length" class="class-grid"><article v-for="item in classes" :key="item.id" class="class-card" :class="{selected:item.id === selectedClassId}" @click="selectedClassId = item.id"><div class="class-card-top"><span>{{ item.subject || 'Subject' }}</span><b>→</b></div><h3>{{ item.className }}</h3><p>{{ item.gradeLevel }} · {{ item.section }}</p><footer><span>{{ item.schedule || 'Schedule not set' }}</span><span>{{ item.id === selectedClassId ? students.length : 'Open' }} students</span></footer></article></div><div v-else class="empty-state"><b>▦</b><h3>Your classes will appear here</h3><p>Create your first class to unlock attendance, activities, and student records.</p><button class="primary" @click="openModal('class')">Create a class</button></div></section>
      <section v-else-if="view === 'students'" class="page"><div class="page-heading"><div><h2>{{ selectedClass ? selectedClass.className : 'Students' }}</h2><p>{{ students.length }} active students enrolled in this class.</p></div><button class="primary" :disabled="!selectedClass" @click="openModal('student')">＋ Add student</button></div><div v-if="students.length" class="panel table-panel"><table><thead><tr><th>Student</th><th>Student number</th><th>Contact</th><th>Guardian</th><th></th></tr></thead><tbody><tr v-for="student in students" :key="student.id"><td><div class="student-cell"><span class="avatar small">{{ student.fullName.slice(0, 1) }}</span><div><strong>{{ student.fullName }}</strong><small>{{ student.email || 'No email added' }}</small></div></div></td><td>{{ student.studentNumber }}</td><td>{{ student.contactNumber || '—' }}</td><td>{{ student.guardianName || '—' }}</td><td><button class="text-button danger" @click="archive(student.id)">Archive</button></td></tr></tbody></table></div><div v-else class="empty-state"><b>♙</b><h3>No students yet</h3><p>Add learners to {{ selectedClass?.className || 'your class' }} to begin.</p></div></section>
      <section v-else-if="view === 'attendance'" class="page"><div class="page-heading"><div><h2>Daily attendance</h2><p>Mark the attendance status for each learner.</p></div><div class="inline-actions"><input v-model="attendanceDate" type="date" /><button class="primary" :disabled="!students.length || busy" @click="submitAttendance">Save attendance</button></div></div><div v-if="students.length" class="panel attendance-list"><div v-for="student in students" :key="student.id" class="attendance-row"><div class="student-cell"><span class="avatar small">{{ student.fullName.slice(0, 1) }}</span><div><strong>{{ student.fullName }}</strong><small>{{ student.studentNumber }}</small></div></div><div class="status-pills"><button v-for="status in attendanceStatuses" :key="status" :class="[status,{selected:(attendance[student.id]?.status || 'present') === status}]" @click="setAttendance(student.id, status)">{{ status }}</button></div><input v-model="attendance[student.id].remarks" aria-label="Remarks" placeholder="Remarks (optional)" /></div></div><div v-else class="empty-state"><b>✓</b><h3>No students to mark</h3><p>Add students to this class first.</p></div></section>
      <section v-else-if="view === 'activities'" class="page"><div class="page-heading"><div><h2>Activities & scores</h2><p>Create assessments and record learner scores.</p></div><button class="primary" :disabled="!selectedClass" @click="openModal('activity')">＋ Create activity</button></div><div v-if="activities.length" class="activity-grid"><article v-for="item in activities" :key="item.id" class="activity-card"><div><span :class="['tag', item.status]">{{ item.status }}</span><span class="tag">{{ activityCategoryLabel(item) }}</span><span class="points">{{ item.totalPoints }} points</span></div><h3>{{ item.title }}</h3><p>{{ item.description || 'No description provided.' }}</p><footer><span>Due {{ isoDate(item.dueDate) }}</span><div><button class="text-button" @click="openScores(item)">Scores</button><button v-if="item.status === 'active'" class="text-button danger" @click="close(item.id)">Close</button></div></footer></article></div><div v-else class="empty-state"><b>◈</b><h3>No activities yet</h3><p>Create an activity to share it with students and begin recording scores.</p></div></section>
      <section v-else-if="view === 'announcements'" class="page"><div class="page-heading"><div><h2>Announcements</h2><p>Keep students updated with timely class information.</p></div><button class="primary" @click="openModal('announcement')">＋ New announcement</button></div><div v-if="announcements.length" class="announcement-list"><article v-for="item in announcements" :key="item.id"><div class="announcement-icon">◉</div><div><div class="announcement-meta"><span class="tag">{{ item.announcementType || 'General' }}</span><span class="announcement-audience">{{ item.classId ? classes.find(c => c.id === item.classId)?.className || 'Class' : 'All students' }}</span><button :class="['featured-toggle', {enabled: item.featured}]" :aria-pressed="item.featured === true" :disabled="busy" @click="toggleFeatured(item.id, !item.featured)"><span>{{ item.featured ? '★' : '☆' }}</span>{{ item.featured ? 'Featured' : 'Feature' }}</button></div><h3>{{ item.title }}</h3><p>{{ item.message }}</p></div></article></div><div v-else class="empty-state"><b>◉</b><h3>Nothing announced yet</h3><p>Post your first update for students.</p></div></section>
      <section v-else-if="view === 'reports'" class="page"><div class="page-heading"><div><h2>Class report</h2><p>A quick view of engagement for {{ selectedClass?.className || 'your selected class' }}.</p></div><button class="secondary" @click="go('attendance')">Review attendance</button></div><div class="report-grid"><article class="panel report-card"><p class="eyebrow">ATTENDANCE</p><strong>{{ students.length ? Math.round(((todaySummary.present || 0) / students.length) * 100) : 0 }}%</strong><p>Present on {{ attendanceDate }}</p><div class="progress"><span :style="{width: `${students.length ? ((todaySummary.present || 0) / students.length) * 100 : 0}%`}"></span></div></article><article class="panel report-card"><p class="eyebrow">CLASS ROSTER</p><strong>{{ students.length }}</strong><p>Active learners enrolled</p><div class="progress blue"><span :style="{width: `${Math.min(students.length * 5, 100)}%`}"></span></div></article><article class="panel report-card"><p class="eyebrow">OPEN ACTIVITIES</p><strong>{{ activeActivities.length }}</strong><p>Ready for student work</p><div class="progress purple"><span :style="{width: `${Math.min(activeActivities.length * 20, 100)}%`}"></span></div></article></div><article class="panel report-table"><div class="panel-title"><h3>Activity score overview</h3></div><div v-if="activities.length" class="compact-list"><div v-for="activity in activities" :key="activity.id"><span class="date-square">{{ activity.totalPoints }}</span><div><strong>{{ activity.title }}</strong><small>{{ activity.status === 'active' ? 'Open for scoring' : 'Closed' }}</small></div><button class="text-button" @click="openScores(activity)">Open scores</button></div></div><p v-else class="empty-copy">Create an activity to start building a score report.</p></article></section>
      <section v-else-if="view === 'utilities'" class="page"><div class="page-heading"><div><p class="eyebrow">ADMINISTRATION</p><h2>Utilities</h2><p>Maintain your teaching workspace and class records.</p></div></div><article class="panel danger-zone"><div class="utility-icon">↻</div><div><p class="eyebrow">DANGER ZONE</p><h3>Reset teaching data</h3><p>Permanently remove all attendance records, activities, activity submissions, and announcements that belong to you. Your classes and student rosters will remain.</p><ul><li>All classes managed by your teacher account are included.</li><li>This action cannot be undone.</li></ul></div><button class="danger-button" @click="openModal('reset')">Reset data</button></article></section>
      </template>

      <template v-else-if="profile?.role === 'student'">
        <section v-if="view === 'dashboard'" class="page">
          <div class="hero-card"><div><p class="eyebrow">TODAY'S PULSE</p><h2>Keep track of your learning</h2><p>{{ myClasses.length }} enrolled classes · {{ todayLabel }}</p></div><div class="hero-orb">{{ myClasses.length }}<small>classes</small></div></div>
          <div class="stat-grid">
            <article><span class="stat-icon blue">▦</span><div><strong>{{ myClasses.length }}</strong><small>Classes</small></div></article>
            <article><span class="stat-icon purple">◈</span><div><strong>{{ myActivities.filter(a => a.status === 'active').length }}</strong><small>Active Activities</small></div></article>
            <article><span class="stat-icon orange">◉</span><div><strong>{{ myAnnouncements.length }}</strong><small>Announcements</small></div></article>
          </div>
          <div class="section-grid">
            <article class="panel"><div class="panel-title"><h3>Recent Announcements</h3><button class="text-button" @click="go('announcements')">View all</button></div>
              <div v-if="myAnnouncements.length" class="compact-list">
                <div v-for="item in myAnnouncements.slice(0, 3)" :key="item.id"><span class="date-square">◉</span><div><strong>{{ item.title }}</strong><small>{{ item.announcementType || 'General' }}</small></div></div>
              </div>
              <p v-else class="empty-copy">No recent announcements.</p>
            </article>
            <article class="panel"><div class="panel-title"><h3>Upcoming Activities</h3><button class="text-button" @click="go('activities')">View all</button></div>
              <div v-if="myActivities.filter(a => a.status === 'active').length" class="compact-list">
                <div v-for="item in myActivities.filter(a => a.status === 'active').slice(0, 4)" :key="item.id"><span class="date-square">{{ isoDate(item.dueDate).split(' ')[1] || '—' }}</span><div><strong>{{ item.title }}</strong><small>Due {{ isoDate(item.dueDate) }}</small></div><b>{{ item.totalPoints }} pts</b></div>
              </div>
              <p v-else class="empty-copy">No upcoming activities.</p>
            </article>
          </div>
        </section>
        
        <section v-else-if="view === 'classes'" class="page">
          <div class="page-heading"><div><h2>Your classes</h2><p>Classes you are currently enrolled in.</p></div></div>
          <div v-if="myClasses.length" class="class-grid">
            <article v-for="item in myClasses" :key="item.id" class="class-card">
              <div class="class-card-top"><span>{{ item.subject || 'Subject' }}</span></div>
              <h3>{{ item.className }}</h3><p>{{ item.gradeLevel }} · {{ item.section }}</p>
              <footer><span>{{ item.schedule || 'Schedule not set' }}</span></footer>
            </article>
          </div>
          <div v-else class="empty-state"><b>▦</b><h3>No classes found</h3><p>You are not currently enrolled in any classes.</p></div>
        </section>
        
        <section v-else-if="view === 'activities'" class="page">
          <div class="page-heading"><div><h2>Activities & scores</h2><p>Your pending tasks and graded activities.</p></div></div>
          <div v-if="myActivities.length" class="activity-grid">
            <article v-for="item in myActivities" :key="item.id" class="activity-card">
              <div>
                <span :class="['tag', mySubmissions.find(s => s.activityId === item.id)?.status || 'missing']">{{ mySubmissions.find(s => s.activityId === item.id)?.status || 'Missing' }}</span>
                <span class="tag">{{ activityCategoryLabel(item) }}</span>
                <span class="points">{{ mySubmissions.find(s => s.activityId === item.id)?.score ?? '?' }} / {{ item.totalPoints }} pts</span>
              </div>
              <h3>{{ item.title }}</h3><p>{{ item.description || 'No description provided.' }}</p>
              <footer><span>Due {{ isoDate(item.dueDate) }}</span><div v-if="mySubmissions.find(s => s.activityId === item.id)?.remarks">Remarks: {{ mySubmissions.find(s => s.activityId === item.id)?.remarks }}</div></footer>
            </article>
          </div>
          <div v-else class="empty-state"><b>◈</b><h3>No activities yet</h3><p>You have no activities assigned across your classes.</p></div>
        </section>
        
        <section v-else-if="view === 'attendance'" class="page">
          <div class="page-heading"><div><h2>My Attendance</h2><p>Your attendance history across classes.</p></div></div>
          <div v-if="myAttendanceHistory.length" class="panel table-panel">
            <table><thead><tr><th>Date</th><th>Class</th><th>Status</th><th>Remarks</th></tr></thead><tbody>
              <tr v-for="record in myAttendanceHistory" :key="record.id">
                <td>{{ record.date }}</td>
                <td>{{ myClasses.find(c => c.id === record.classId)?.className || 'Class' }}</td>
                <td><span :class="['status-pills', 'selected', record.status]" style="padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize;">{{ record.status }}</span></td>
                <td>{{ record.remarks || '—' }}</td>
              </tr>
            </tbody></table>
          </div>
          <div v-else class="empty-state"><b>✓</b><h3>No attendance records</h3><p>Your attendance history is currently empty.</p></div>
        </section>
        
        <section v-else-if="view === 'announcements'" class="page">
          <div class="page-heading"><div><h2>Announcements</h2><p>Updates and information from your teachers.</p></div></div>
          <div v-if="myAnnouncements.length" class="announcement-list">
            <article v-for="item in myAnnouncements" :key="item.id">
              <div class="announcement-icon">◉</div>
              <div>
                <div class="announcement-meta">
                  <span class="tag">{{ item.announcementType || 'General' }}</span>
                  <span class="announcement-audience">{{ item.classId ? myClasses.find(c => c.id === item.classId)?.className || 'Class' : 'Global' }}</span>
                  <span v-if="item.featured" class="tag featured" style="color: var(--accent); border-color: var(--accent);">★ Featured</span>
                </div>
                <h3>{{ item.title }}</h3><p>{{ item.message }}</p>
              </div>
            </article>
          </div>
          <div v-else class="empty-state"><b>◉</b><h3>No announcements</h3><p>You're all caught up!</p></div>
        </section>
      </template>
    </section>
  </main>

  <div v-if="modal" class="modal-backdrop" @click.self="closeModal"><form v-if="modal === 'class'" class="modal-card" @submit.prevent="submitClass"><div class="modal-title"><div><p class="eyebrow">NEW CLASS</p><h2>Create a class</h2></div><button type="button" class="icon-button" @click="closeModal">×</button></div><label>Class name<input v-model="classForm.className" required placeholder="e.g. ICT 10" /></label><div class="form-grid"><label>Subject<input v-model="classForm.subject" required placeholder="Information Technology" /></label><label>Grade level<input v-model="classForm.gradeLevel" required placeholder="Grade 10" /></label></div><div class="form-grid"><label>Section<input v-model="classForm.section" required placeholder="Section A" /></label><label>Schedule<input v-model="classForm.schedule" placeholder="Mon · 9:00 AM" /></label></div><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">Create class</button></div></form>
    <form v-else-if="modal === 'student'" class="modal-card" @submit.prevent="submitStudent"><div class="modal-title"><div><p class="eyebrow">NEW STUDENT</p><h2>Enroll a student</h2></div><button type="button" class="icon-button" @click="closeModal">×</button></div><div class="form-grid"><label>Student number<input v-model="studentForm.studentNumber" required /></label><label>Full name<input v-model="studentForm.fullName" required /></label></div><div class="form-grid"><label>Email<input v-model="studentForm.email" type="email" /></label><label>Contact number<input v-model="studentForm.contactNumber" /></label></div><div class="form-grid"><label>Guardian name<input v-model="studentForm.guardianName" /></label><label>Guardian contact<input v-model="studentForm.guardianContact" /></label></div><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">Enroll student</button></div></form>
    <form v-else-if="modal === 'activity'" class="modal-card" @submit.prevent="submitActivity"><div class="modal-title"><div><p class="eyebrow">NEW ACTIVITY</p><h2>Create an activity</h2></div><button type="button" class="icon-button" @click="closeModal">×</button></div><label>Title<input v-model="activityForm.title" required placeholder="e.g. Web design quiz" /></label><label>Category<select v-model="activityForm.activityCategory"><option value="peta">PETA</option><option value="quiz">Quiz</option><option value="coding">Coding</option></select></label><label>Description<textarea v-model="activityForm.description" placeholder="Instructions for students"></textarea></label><div class="form-grid"><label>Due date<input v-model="activityForm.dueDate" type="date" /></label><label>Total points<input v-model.number="activityForm.totalPoints" required min="1" type="number" /></label></div><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">Create activity</button></div></form>
    <form v-else-if="modal === 'announcement'" class="modal-card" @submit.prevent="submitAnnouncement"><div class="modal-title"><div><p class="eyebrow">ANNOUNCEMENT</p><h2>Share an update</h2></div><button type="button" class="icon-button" @click="closeModal">×</button></div><label>Title<input v-model="announcementForm.title" required /></label><label>Message<textarea v-model="announcementForm.message" required placeholder="What do students need to know?"></textarea></label><div class="form-grid"><label>Type<select v-model="announcementForm.announcementType"><option value="General">General</option><option value="Academic">Academic</option><option value="Events">Events</option></select></label><label>Audience<select v-model="announcementForm.targetRole"><option value="students">Students</option><option value="all">Everyone</option><option value="teachers">Teachers</option></select></label></div><label>Class <small>(optional)</small><select v-model="announcementForm.classId"><option value="">All classes</option><option v-for="item in classes" :key="item.id" :value="item.id">{{ item.className }} · {{ item.section }}</option></select></label><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">Publish announcement</button></div></form>
    <form v-else-if="modal === 'scores' && selectedActivity" class="modal-card wide" @submit.prevent="submitScores"><div class="modal-title"><div><p class="eyebrow">SCORE ENCODING</p><h2>{{ selectedActivity.title }}</h2><p>{{ selectedActivity.totalPoints }} points possible</p></div><button type="button" class="icon-button" @click="closeModal">×</button></div><div class="score-list"><div v-for="student in students" :key="student.id" class="score-row"><div><strong>{{ student.fullName }}</strong><small>{{ student.studentNumber }}</small></div><select v-model="submissions[student.id].status"><option value="submitted">Submitted</option><option value="late">Late</option><option value="missing">Missing</option><option value="excused">Excused</option></select><input v-model.number="submissions[student.id].score" type="number" min="0" :max="selectedActivity.totalPoints" placeholder="Score" /><input v-model="submissions[student.id].remarks" placeholder="Remarks" /></div></div><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">Save scores</button></div></form>
    <form v-else class="modal-card reset-modal" @submit.prevent="resetData"><div class="modal-title"><div><p class="eyebrow">PERMANENT ACTION</p><h2>Reset your teaching data</h2></div><button type="button" class="icon-button" @click="closeModal">×</button></div><p>This will permanently delete your attendance, activities, activity submissions, and announcements across every class you manage. Classes and student rosters are not affected.</p><label>Type <strong>RESET</strong> to continue<input v-model="resetConfirmation" autocomplete="off" placeholder="RESET" /></label><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="danger-button" :disabled="resetConfirmation !== 'RESET' || busy">{{ busy ? 'Resetting…' : 'Permanently reset data' }}</button></div></form></div>
</template>
