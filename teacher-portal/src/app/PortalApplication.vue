<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useAuthStore} from '../stores/auth';
import {convertImageToWebP} from '../composables/useImageOptimization';
import {downloadExtension, downloadMaterial, shortDownloadName} from '../composables/useFileDownload';
import {useQuizQuestionFlow} from '../composables/useQuizQuestionFlow';
import {extractQuestions, isCorrectAnswer, quizOptionEntries, scoreQuiz} from '../domain/quiz';
import {createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut, type User} from 'firebase/auth';
import {Timestamp} from 'firebase/firestore';
import classTrackSymbol from '../assets/class-track-symbol.png';
import AppBrand from '../components/shell/AppBrand.vue';
import {auth, isFirebaseConfigured} from '../firebase';
import {createStudentUserProfile, getUserProfile} from '../services/auth.service';
import {archiveClass, deleteClass, getClassesByIds, getTeacherClasses, saveClass} from '../services/classes.service';
import {archiveStudent, claimRosterStudent, findRosterStudent, getStudentRecordByUserId, getStudentsByClass, MAX_PROFILE_PHOTO_BYTES, saveStudent, updateStudentProfile, uploadStudentProfilePhoto} from '../services/students.service';
import {getAttendance, getStudentAttendanceRecords, saveAttendance} from '../services/attendance.service';
import {closeActivity, getActivities, getStudentActivities, removeActivityMaterial, saveActivity, uploadActivityMaterials} from '../services/activities.service';
import {getAnnouncements, getStudentAnnouncements, saveAnnouncement, setAnnouncementFeatured} from '../services/announcements.service';
import {getStudentSubmissions, getSubmissions, saveScores, submitStudentQuiz} from '../services/submissions.service';
import {resetTeacherData} from '../services/administration.service';
import type {ActivityCategory, ActivityMaterial, ActivityRecord, AnnouncementRecord, AttendanceRecord, AttendanceStatus, ClassRecord, QuizAnswer, QuizDocument, QuizQuestion, StudentRecord, SubmissionRecord, SubmissionStatus, UserProfile} from '../types';

type View = 'dashboard' | 'classes' | 'students' | 'attendance' | 'activities' | 'announcements' | 'reports' | 'utilities' | 'profile' | 'take-quiz' | 'review-quiz';
type Modal = 'class' | 'class-action' | 'student' | 'edit-profile' | 'profile-photo' | 'activity' | 'announcement' | 'scores' | 'reset' | 'answer-key' | 'logout' | 'confirm-next-question' | 'submit-quiz' | 'exit-quiz' | 'remove-material' | null;

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const currentUser = ref<User | null>(null);
const profile = ref<UserProfile | null>(null);
const view = ref<View>('dashboard');
const modal = ref<Modal>(null);
const busy = ref(false);
const imageConversionsInProgress = ref(0);
const convertingImages = computed(() => imageConversionsInProgress.value > 0);
const downloadingMaterialId = ref<string | null>(null);
const loading = ref(true);
const message = ref('');
const error = ref('');
const email = ref('');
const password = ref('');
const mobileMenuOpen = ref(false);
const mobileMenuButton = ref<HTMLButtonElement | null>(null);
const mobileMenuCloseButton = ref<HTMLButtonElement | null>(null);

const authMode = ref<'login' | 'verify' | 'register' | 'verify-notice'>('login');
const registeredEmailForNotice = ref('');
const regStudentNumber = ref('');
const regFullName = ref('');
const regEmail = ref('');
const regPassword = ref('');
const regConfirmPassword = ref('');
const verifiedRosterStudent = ref<StudentRecord | null>(null);
const classes = ref<ClassRecord[]>([]);
const selectedClassId = ref('');
const students = ref<StudentRecord[]>([]);
const activities = ref<ActivityRecord[]>([]);
const announcements = ref<Awaited<ReturnType<typeof getAnnouncements>>>([]);
const attendance = ref<Record<string, {status: AttendanceStatus; remarks: string}>>({});
const submissions = ref<Record<string, {status: SubmissionStatus; score: number | null; remarks: string}>>({});
const attendanceDate = ref(new Date().toISOString().slice(0, 10));
const selectedActivity = ref<ActivityRecord | null>(null);
const selectedAnswerKey = ref<ActivityRecord | null>(null);
const pendingMaterialRemoval = ref<{activity: ActivityRecord; material: ActivityMaterial; kind: 'material' | 'peta-output'} | null>(null);
const resetConfirmation = ref('');
const attendanceStatuses: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];
const studentScoreViewingEnabled = false;
const navItems = computed(() => {
  if (profile.value?.role === 'student') {
    return [
      {id: 'dashboard', icon: 'home', label: 'Overview'}, {id: 'classes', icon: 'school', label: 'My Classes'},
      {id: 'activities', icon: 'assignment', label: 'Activities & Scores'}, {id: 'attendance', icon: 'fact_check', label: 'My Attendance'},
      {id: 'announcements', icon: 'campaign', label: 'Announcements'},
    ] as {id: View; icon: string; label: string}[];
  }
  return [
    {id: 'dashboard', icon: 'home', label: 'Overview'}, {id: 'classes', icon: 'school', label: 'Classes'},
    {id: 'students', icon: 'groups', label: 'Students'}, {id: 'attendance', icon: 'fact_check', label: 'Attendance'},
    {id: 'activities', icon: 'assignment', label: 'Activities'}, {id: 'announcements', icon: 'campaign', label: 'Announcements'},
    {id: 'reports', icon: 'analytics', label: 'Reports'}, {id: 'utilities', icon: 'settings', label: 'Utilities'},
  ] as {id: View; icon: string; label: string}[];
});

// Student Data
const myStudentRecord = ref<StudentRecord | null>(null);
const myClasses = ref<ClassRecord[]>([]);
const myActivities = ref<ActivityRecord[]>([]);
const mySubmissions = ref<SubmissionRecord[]>([]);
const myAttendanceHistory = ref<AttendanceRecord[]>([]);
const myAnnouncements = ref<AnnouncementRecord[]>([]);
const profilePhotoUploading = ref(false);
const profilePhotoVersion = ref(0);
const profileCameraInput = ref<HTMLInputElement | null>(null);
const profileLibraryInput = ref<HTMLInputElement | null>(null);

// Quiz Data
const takingQuiz = ref<ActivityRecord | null>(null);
const quizAnswers = ref<Record<string, QuizAnswer>>({});
const quizSubmitted = ref(false);
const quizScore = ref(0);
const quizQuestionError = ref('');
const exitQuizError = ref('');
const {currentQuestionIndex: currentQuizQuestionIndex, questionCard: quizQuestionCard, reset: resetQuizQuestionFlow, advance: advanceQuizQuestion} = useQuizQuestionFlow();
const reviewingQuiz = ref<ActivityRecord | null>(null);
const reviewSubmission = ref<SubmissionRecord | null>(null);

const classForm = reactive({className: '', subject: '', gradeLevel: '', section: '', schedule: ''});
const editingClassId = ref<string | null>(null);
const pendingClassAction = ref<{classRecord: ClassRecord; action: 'archive' | 'delete'} | null>(null);
const classActionConfirmation = ref('');
const studentForm = reactive({studentNumber: '', fullName: '', email: '', contactNumber: '', guardianName: '', guardianContact: ''});
const studentProfileForm = reactive({contactNumber: '', dateOfBirth: '', gender: '', guardianName: '', guardianContact: ''});
const activityForm = reactive({
  title: '',
  description: '',
  dueDate: '',
  totalPoints: 100,
  activityCategory: 'peta' as ActivityCategory,
  quizData: null as QuizDocument | null,
  quizFileName: '',
  quizFileError: '',
  materialFiles: [] as File[],
  existingMaterials: [] as ActivityMaterial[],
  materialFileError: '',
  petaOutputFiles: [] as File[],
  existingPetaOutputs: [] as ActivityMaterial[],
  petaOutputError: '',
});
const announcementForm = reactive({title: '', message: '', classId: '', targetRole: 'students' as 'all' | 'students' | 'teachers', announcementType: 'General' as 'General' | 'Academic' | 'Events'});

const authModeByRoute = {
  login: 'login',
  'register-verify': 'verify',
  'register-account': 'register',
  'verify-email': 'verify-notice',
} as const;

watch(() => route.name, name => {
  const routeAuthMode = authModeByRoute[name as keyof typeof authModeByRoute];
  if (routeAuthMode) authMode.value = routeAuthMode;
  const routeView = route.meta.view as View | undefined;
  if (routeView) view.value = routeView;
}, {immediate: true});

const selectedClass = computed(() => classes.value.find(item => item.id === selectedClassId.value) ?? null);
const activeActivities = computed(() => activities.value.filter(item => item.status === 'active'));
const todaySummary = computed(() => Object.values(attendance.value).reduce((summary, item) => {
  summary[item.status] = (summary[item.status] ?? 0) + 1;
  return summary;
}, {} as Record<AttendanceStatus, number>));
const studentAttendanceSummary = computed(() => myAttendanceHistory.value.reduce((summary, record) => {
  const status = record.status?.toLowerCase() as AttendanceStatus;
  if (status === 'present' || status === 'absent' || status === 'excused') {
    summary[status] += 1;
  }
  return summary;
}, {present: 0, absent: 0, excused: 0}));
const studentById = computed(() => new Map(students.value.map(item => [item.id, item])));
const userName = computed(() => {
  const name = (profile.value?.fullName || myStudentRecord.value?.fullName)?.trim();
  if (!name) return profile.value?.role === 'student' ? 'Student' : 'Teacher';
  if (name.includes(',')) {
    const parts = name.split(',');
    const firstNamePart = parts[1]?.trim();
    if (firstNamePart) {
      const firstName = firstNamePart.split(' ')[0];
      if (firstName) return firstName;
    }
  }
  return name.split(' ')[0];
});
const studentAcademicLabel = computed(() => {
  const labels = myClasses.value.map(classRecord => {
    const grade = classRecord.gradeLevel?.trim();
    const section = classRecord.section?.trim();
    return [grade, section].filter(Boolean).join(' · ');
  }).filter(Boolean);
  return [...new Set(labels)].join('  •  ') || 'No active grade and section assigned';
});
const signedInEmail = computed(() => currentUser.value?.email?.trim() || profile.value?.email?.trim() || '');
const studentProfilePhotoUrl = computed(() => {
  const url = myStudentRecord.value?.photoUrl?.trim();
  if (!url || !profilePhotoVersion.value) return url || '';
  return `${url}${url.includes('?') ? '&' : '?'}v=${profilePhotoVersion.value}`;
});
const quizQuestions = computed(() => extractQuestions(takingQuiz.value?.quizData));
const currentQuizQuestion = computed(() => quizQuestions.value[currentQuizQuestionIndex.value]);
const currentQuizOptionEntries = computed(() => quizOptionEntries(currentQuizQuestion.value));
const currentQuizAnswer = computed(() => quizAnswers.value[String(currentQuizQuestionIndex.value)]);
const hasCurrentQuizAnswer = computed(() => currentQuizAnswer.value !== undefined && currentQuizAnswer.value !== null);
const isLastQuizQuestion = computed(() => currentQuizQuestionIndex.value === quizQuestions.value.length - 1);
const currentQuizAnswerLabel = computed(() => {
  const answer = currentQuizAnswer.value;
  if (answer === undefined || answer === null) return '';
  return String(currentQuizOptionEntries.value.find(([key]) => key === String(answer))?.[1] ?? answer);
});
const lockedQuizProgress = computed(() => Math.round((currentQuizQuestionIndex.value / Math.max(quizQuestions.value.length, 1)) * 100));
const answeredQuizQuestionCount = computed(() => quizQuestions.value.reduce((count, _question, index) => {
  const answer = quizAnswers.value[String(index)];
  return count + (answer !== undefined && answer !== null ? 1 : 0);
}, 0));
const unansweredQuizQuestionCount = computed(() => Math.max(quizQuestions.value.length - answeredQuizQuestionCount.value, 0));
const todayLabel = new Intl.DateTimeFormat(undefined, {weekday: 'long', month: 'long', day: 'numeric'}).format(new Date());

function resetAlerts() { error.value = ''; message.value = ''; }
function showMessage(value: string) { error.value = ''; message.value = value; window.setTimeout(() => { if (message.value === value) message.value = ''; }, 3800); }
function userFacingError(value: unknown) {
  const code = typeof value === 'object' && value && 'code' in value
    ? String(value.code)
    : '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account already exists for this email address.',
    'auth/invalid-credential': 'The email address or password is incorrect. Please try again.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/network-request-failed': 'We could not reach the server. Check your internet connection and try again.',
    'auth/too-many-requests': 'Too many sign-in attempts. Please wait a moment and try again.',
    'auth/weak-password': 'Choose a password with at least six characters.',
    'auth/wrong-password': 'The email address or password is incorrect. Please try again.',
    'auth/user-not-found': 'The email address or password is incorrect. Please try again.',
  };
  if (messages[code]) return messages[code];
  if (value instanceof Error && !value.message.startsWith('Firebase:')) return value.message;
  return 'We could not complete your request. Please try again.';
}
function showError(value: unknown) { message.value = ''; error.value = userFacingError(value); }
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
  const requestedClassId = typeof route.query.class === 'string' ? route.query.class : '';
  if (requestedClassId && classes.value.some(item => item.id === requestedClassId)) selectedClassId.value = requestedClassId;
  else if (!selectedClassId.value || !classes.value.some(item => item.id === selectedClassId.value)) selectedClassId.value = classes.value[0]?.id ?? '';
  if (route.path.startsWith('/admin/') && selectedClassId.value && requestedClassId !== selectedClassId.value) {
    await router.replace({query: {...route.query, class: selectedClassId.value}});
  }
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
        const activeClassIds = myClasses.value.map(item => item.id);
        myActivities.value = await getStudentActivities(activeClassIds);
        mySubmissions.value = await getStudentSubmissions(myStudentRecord.value.id);
        myAttendanceHistory.value = await getStudentAttendanceRecords(myStudentRecord.value.id);
        myAnnouncements.value = await getStudentAnnouncements(activeClassIds);
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
watch(selectedClassId, classId => {
  if (!classId || profile.value?.role !== 'teacher' || !route.path.startsWith('/admin/')) return;
  if (route.query.class === classId) return;
  router.replace({query: {...route.query, class: classId}});
});
watch(() => route.query.class, requested => {
  if (profile.value?.role !== 'teacher' || !classes.value.length) return;
  const requestedId = typeof requested === 'string' ? requested : '';
  const nextId = classes.value.some(item => item.id === requestedId) ? requestedId : classes.value[0].id;
  if (selectedClassId.value !== nextId) selectedClassId.value = nextId;
  if (requestedId !== nextId) router.replace({query: {...route.query, class: nextId}});
});
watch(mobileMenuOpen, open => {
  document.body.style.overflow = open ? 'hidden' : '';
});
function closeMobileMenu(returnFocus = true) {
  if (!mobileMenuOpen.value) return;
  mobileMenuOpen.value = false;
  if (returnFocus) nextTick(() => mobileMenuButton.value?.focus());
}
function openMobileMenu() {
  mobileMenuOpen.value = true;
  nextTick(() => mobileMenuCloseButton.value?.focus());
}
function handleMobileMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMobileMenu();
}
function handleMobileMenuResize() {
  if (window.innerWidth > 760) closeMobileMenu(false);
}
function selectMobileView(next: View) {
  go(next);
  closeMobileMenu();
}
function openMobileLogout() {
  closeMobileMenu();
  openModal('logout');
}
onMounted(() => {
  window.addEventListener('keydown', handleMobileMenuKeydown);
  window.addEventListener('resize', handleMobileMenuResize);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleMobileMenuKeydown);
  window.removeEventListener('resize', handleMobileMenuResize);
  document.body.style.overflow = '';
});
onMounted(() => onAuthStateChanged(auth, async user => {
  currentUser.value = user;
  loading.value = true;
  resetAlerts();
  try {
    if (user) {
      if (authMode.value === 'register') {
        loading.value = false;
        return;
      }
      const nextProfile = await getUserProfile(user.uid);
      if (!nextProfile || nextProfile.status !== 'active' || !['teacher', 'student'].includes(nextProfile.role)) {
        await signOut(auth);
        throw new Error('This account is not an active user account.');
      }
      if (nextProfile.role === 'student' && !user.emailVerified) {
        await signOut(auth);
        profile.value = null;
        currentUser.value = null;
        throw new Error('Please verify your email address before logging in. Check your inbox for the verification link.');
      }
      profile.value = nextProfile;
      authStore.user = user;
      authStore.profile = nextProfile;
      await loadPortal();
      if (route.meta.public) await router.replace(nextProfile.role === 'teacher' ? '/admin/overview' : '/student/overview');
    } else {
      profile.value = null;
      authStore.user = null;
      authStore.profile = null;
      if (!route.meta.public) await router.replace('/login');
    }
  } catch (value) { showError(value); }
  finally { loading.value = false; }
}));

async function login() {
  resetAlerts(); busy.value = true;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    const userProfile = await getUserProfile(userCredential.user.uid);
    if (userProfile?.role === 'student' && !userCredential.user.emailVerified) {
      await signOut(auth);
      profile.value = null;
      currentUser.value = null;
      throw new Error('Please verify your email address before logging in. Check your inbox for the verification link.');
    }
  }
  catch (value) { showError(value); }
  finally { busy.value = false; }
}

function switchAuthMode(mode: 'login' | 'verify' | 'register' | 'verify-notice') {
  resetAlerts();
  authMode.value = mode;
  const destinations = {login: '/login', verify: '/register/verify', register: '/register/account', 'verify-notice': '/verify-email'} as const;
  if (route.path !== destinations[mode]) router.push(destinations[mode]);
  if (mode === 'login') {
    regStudentNumber.value = '';
    regFullName.value = '';
    regEmail.value = '';
    regPassword.value = '';
    regConfirmPassword.value = '';
    verifiedRosterStudent.value = null;
  }
}

async function verifyStudent() {
  resetAlerts();
  if (!regStudentNumber.value.trim()) {
    showError('Student number is required.');
    return;
  }
  if (!regFullName.value.trim()) {
    showError('Full name is required.');
    return;
  }
  busy.value = true;
  try {
    const rosterStudent = await findRosterStudent(regStudentNumber.value);
    if (!rosterStudent) {
      throw new Error('We could not find an unclaimed student record with that number.');
    }
    if (rosterStudent.fullName.trim().toLowerCase() !== regFullName.value.trim().toLowerCase()) {
      throw new Error('The full name provided does not match our records.');
    }
    verifiedRosterStudent.value = rosterStudent;
    switchAuthMode('register');
  } catch (value) {
    showError(value);
  } finally {
    busy.value = false;
  }
}

async function registerStudentAccount() {
  resetAlerts();
  if (!verifiedRosterStudent.value) {
    showError('Please verify your student details first.');
    authMode.value = 'verify';
    return;
  }
  if (!regEmail.value.trim() || !regEmail.value.includes('@')) {
    showError('Enter a valid email address.');
    return;
  }
  if (regPassword.value.length < 6) {
    showError('Password must be at least 6 characters.');
    return;
  }
  if (regPassword.value !== regConfirmPassword.value) {
    showError('Passwords do not match.');
    return;
  }
  busy.value = true;
  try {
    const normalizedEmail = regEmail.value.trim().toLowerCase();
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, regPassword.value);
    
    // Send email verification link to student
    await sendEmailVerification(userCredential.user);

    // Wait briefly to ensure the Firebase Auth token has propagated to the Firestore SDK
    await new Promise(resolve => setTimeout(resolve, 1200));

    if (!auth.currentUser) {
      throw new Error("User was unexpectedly signed out before profile creation.");
    }

    try {
      await createStudentUserProfile(userCredential.user.uid, {
        fullName: verifiedRosterStudent.value.fullName,
        email: normalizedEmail,
        role: 'student',
        studentId: verifiedRosterStudent.value.id,
        studentNumber: verifiedRosterStudent.value.studentNumber,
        teacherId: null,
        classIds: verifiedRosterStudent.value.classIds || [],
        status: 'active',
      });
    } catch (e) {
      throw new Error(`Profile creation failed: ${(e as Error).message}`);
    }

    try {
      await claimRosterStudent(verifiedRosterStudent.value.id, userCredential.user.uid, normalizedEmail);
    } catch (e) {
      throw new Error(`Student claim failed: ${(e as Error).message}`);
    }

    // Sign out user immediately so they must verify email first
    await signOut(auth);
    profile.value = null;
    currentUser.value = null;

    registeredEmailForNotice.value = normalizedEmail;
    switchAuthMode('verify-notice');
    showMessage('Registration successful! Please verify your email address before logging in.');
  } catch (value) {
    showError(value);
  } finally {
    busy.value = false;
  }
}

async function resendVerificationEmail() {
  resetAlerts();
  const targetEmail = registeredEmailForNotice.value || email.value.trim();
  if (!targetEmail || !password.value) {
    showError('Please enter your email and password to resend the verification link.');
    return;
  }
  busy.value = true;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password.value);
    if (userCredential.user.emailVerified) {
      await signOut(auth);
      showMessage('Your email is already verified! You can now log in.');
      authMode.value = 'login';
      return;
    }
    await sendEmailVerification(userCredential.user);
    await signOut(auth);
    showMessage(`Verification email resent to ${targetEmail}. Please check your inbox.`);
  } catch (value) {
    showError(value);
  } finally {
    busy.value = false;
  }
}
async function logout() { busy.value = true; try { await signOut(auth); closeModal(); await router.replace('/login'); } finally { busy.value = false; } }
function openModal(type: Modal) { resetAlerts(); modal.value = type; }
const editingActivityId = ref<string | null>(null);

function resetActivityForm() {
  editingActivityId.value = null;
  Object.assign(activityForm, {
    title: '',
    description: '',
    dueDate: '',
    totalPoints: 100,
    activityCategory: 'peta',
    quizData: null,
    quizFileName: '',
    quizFileError: '',
    materialFiles: [],
    existingMaterials: [],
    materialFileError: '',
    petaOutputFiles: [],
    existingPetaOutputs: [],
    petaOutputError: '',
  });
}
function closeModal() {
  if (modal.value === 'activity' && convertingImages.value) return;
  modal.value = null;
  selectedActivity.value = null;
  pendingMaterialRemoval.value = null;
  pendingClassAction.value = null;
  classActionConfirmation.value = '';
  resetConfirmation.value = '';
  resetActivityForm();
}

function resetClassForm() {
  editingClassId.value = null;
  Object.assign(classForm, {className: '', subject: '', gradeLevel: '', section: '', schedule: ''});
}
function openNewClass() {
  resetClassForm();
  openModal('class');
}
function openClassEditor(classRecord: ClassRecord) {
  editingClassId.value = classRecord.id;
  Object.assign(classForm, {
    className: classRecord.className,
    subject: classRecord.subject,
    gradeLevel: classRecord.gradeLevel,
    section: classRecord.section,
    schedule: classRecord.schedule,
  });
  openModal('class');
}
function openStudentProfileEditor() {
  if (!myStudentRecord.value) return;
  Object.assign(studentProfileForm, {
    contactNumber: myStudentRecord.value.contactNumber || '',
    dateOfBirth: myStudentRecord.value.dateOfBirth || '',
    gender: myStudentRecord.value.gender || '',
    guardianName: myStudentRecord.value.guardianName || '',
    guardianContact: myStudentRecord.value.guardianContact || '',
  });
  openModal('edit-profile');
}
function requestClassAction(classRecord: ClassRecord, action: 'archive' | 'delete') {
  pendingClassAction.value = {classRecord, action};
  classActionConfirmation.value = '';
  openModal('class-action');
}
function openEditActivity(activity: ActivityRecord) {
  resetAlerts();
  editingActivityId.value = activity.id;
  
  let dueDateStr = '';
  if (activity.dueDate) {
    const d = activity.dueDate instanceof Date 
      ? activity.dueDate 
      : 'toDate' in activity.dueDate 
        ? activity.dueDate.toDate() 
        : new Date(activity.dueDate);
    if (!isNaN(d.getTime())) {
      dueDateStr = d.toISOString().slice(0, 10);
    }
  }

  const category = activity.activityCategory || (/quiz/i.test(`${activity.title} ${activity.description}`) ? 'quiz' : 'peta');

  Object.assign(activityForm, {
    title: activity.title || '',
    description: activity.description || '',
    dueDate: dueDateStr,
    totalPoints: activity.totalPoints ?? 100,
    activityCategory: category,
    quizData: activity.quizData || null,
    quizFileName: activity.quizData ? 'Existing Quiz JSON Attached' : '',
    quizFileError: '',
    materialFiles: [],
    existingMaterials: activity.materials || [],
    materialFileError: '',
    petaOutputFiles: [],
    existingPetaOutputs: activity.petaOutputs || (activity.petaOutput ? [activity.petaOutput] : []),
    petaOutputError: '',
  });

  modal.value = 'activity';
}
function handleQuizFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    activityForm.quizData = null;
    activityForm.quizFileName = '';
    activityForm.quizFileError = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const parsed = JSON.parse(text);
      activityForm.quizData = parsed;
      activityForm.quizFileName = file.name;
      activityForm.quizFileError = '';
    } catch (err) {
      activityForm.quizData = null;
      activityForm.quizFileName = '';
      activityForm.quizFileError = 'Invalid JSON file. Please select a valid JSON format.';
    }
  };
  reader.onerror = () => {
    activityForm.quizData = null;
    activityForm.quizFileName = '';
    activityForm.quizFileError = 'Error reading file.';
  };
  reader.readAsText(file);
}
async function handleMaterialFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  const invalid = files.find(file => !file.type.startsWith('image/') && file.type !== 'text/html' && !/\.html?$/i.test(file.name));
  const tooLarge = files.find(file => file.size > 10 * 1024 * 1024);
  const totalCount = activityForm.existingMaterials.length + activityForm.materialFiles.length + files.length;

  if (invalid) {
    activityForm.materialFileError = `${invalid.name} is not an image or HTML file.`;
  } else if (tooLarge) {
    activityForm.materialFileError = `${tooLarge.name} is larger than 10 MB.`;
  } else if (totalCount > 10) {
    activityForm.materialFileError = 'You can attach up to 10 materials to one activity.';
  } else {
    imageConversionsInProgress.value += 1;
    try {
      const optimized = await Promise.all(files.map(file => file.type.startsWith('image/') ? convertImageToWebP(file) : file));
      activityForm.materialFiles.push(...optimized);
      activityForm.materialFileError = '';
    } catch {
      activityForm.materialFileError = 'One or more images could not be converted to WebP. Please try a different image.';
    } finally {
      imageConversionsInProgress.value -= 1;
    }
  }
}
function removePendingMaterial(index: number) {
  activityForm.materialFiles.splice(index, 1);
  activityForm.materialFileError = '';
}
async function handlePetaOutputFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  const invalid = files.find(file => !file.type.startsWith('image/'));
  const tooLarge = files.find(file => file.size > 10 * 1024 * 1024);
  const totalCount = activityForm.existingPetaOutputs.length + activityForm.petaOutputFiles.length + files.length;
  if (invalid) {
    activityForm.petaOutputError = `${invalid.name} is not an image file.`;
  } else if (tooLarge) {
    activityForm.petaOutputError = `${tooLarge.name} is larger than 10 MB.`;
  } else if (totalCount > 10) {
    activityForm.petaOutputError = 'You can attach up to 10 PETA output images.';
  } else {
    imageConversionsInProgress.value += 1;
    try {
      activityForm.petaOutputFiles.push(...await Promise.all(files.map(file => convertImageToWebP(file))));
      activityForm.petaOutputError = '';
    } catch {
      activityForm.petaOutputError = 'One or more images could not be converted to WebP. Please try a different image.';
    } finally {
      imageConversionsInProgress.value -= 1;
    }
  }
}
function removePendingPetaOutput(index: number) {
  activityForm.petaOutputFiles.splice(index, 1);
  activityForm.petaOutputError = '';
}
function materialKind(material: ActivityMaterial) {
  return material.contentType === 'text/html' || /\.html?$/i.test(material.fileName) ? 'HTML' : 'Image';
}
function petaOutputsFor(activity: ActivityRecord) {
  return activity.petaOutputs || (activity.petaOutput ? [activity.petaOutput] : []);
}
function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
async function downloadAttachment(material: ActivityMaterial, prefix: 'PETA' | 'RES', index: number) {
  if (downloadingMaterialId.value) return;
  downloadingMaterialId.value = material.id;
  try {
    await downloadMaterial(material, `${shortDownloadName(prefix, index)}.${downloadExtension(material)}`);
  } catch (value) {
    showError(value);
  } finally {
    downloadingMaterialId.value = null;
  }
}
function go(next: View) {
  const rolePrefix = profile.value?.role === 'student' ? '/student' : '/admin';
  const segment = next === 'dashboard' ? 'overview' : next;
  router.push({path: `${rolePrefix}/${segment}`, query: profile.value?.role === 'teacher' && selectedClassId.value ? {class: selectedClassId.value} : {}});
}

async function submitClass() {
  if (!currentUser.value) return;
  busy.value = true;
  try {
    const isEdit = Boolean(editingClassId.value);
    const id = await saveClass(currentUser.value.uid, {...classForm}, editingClassId.value || undefined);
    await loadClasses();
    selectedClassId.value = id;
    resetClassForm();
    closeModal();
    showMessage(isEdit ? 'Class updated successfully.' : 'Class created successfully.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
async function confirmClassAction() {
  const pending = pendingClassAction.value;
  if (!pending || (pending.action === 'delete' && classActionConfirmation.value !== 'DELETE')) return;
  busy.value = true;
  try {
    if (pending.action === 'archive') await archiveClass(pending.classRecord.id);
    else await deleteClass(pending.classRecord.id);
    if (selectedClassId.value === pending.classRecord.id) selectedClassId.value = '';
    await loadClasses();
    await loadClassData();
    closeModal();
    showMessage(pending.action === 'archive' ? `${pending.classRecord.className} was archived.` : `${pending.classRecord.className} and its related records were permanently deleted.`);
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
async function submitStudentProfile() {
  if (!myStudentRecord.value) return;
  busy.value = true;
  try {
    await updateStudentProfile(myStudentRecord.value.id, {...studentProfileForm});
    Object.assign(myStudentRecord.value, studentProfileForm);
    closeModal();
    showMessage('Your profile information was updated.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
async function handleStudentProfilePhoto(event: Event) {
  const input = event.target as HTMLInputElement;
  const image = input.files?.[0];
  input.value = '';
  if (!image || !myStudentRecord.value || profilePhotoUploading.value) return;
  if (!image.type.startsWith('image/')) {
    showError('Please choose a valid image file.');
    return;
  }
  if (image.size > MAX_PROFILE_PHOTO_BYTES) {
    showError('Profile photos must be 5 MB or smaller.');
    return;
  }

  resetAlerts();
  profilePhotoUploading.value = true;
  try {
    const optimizedImage = await convertImageToWebP(image, 0.8, 1024);
    const photoUrl = await uploadStudentProfilePhoto(myStudentRecord.value.id, optimizedImage);
    myStudentRecord.value = {...myStudentRecord.value, photoUrl};
    profilePhotoVersion.value = Date.now();
    showMessage('Your profile photo was updated.');
  } catch (value) {
    showError(value);
  } finally {
    profilePhotoUploading.value = false;
  }
}
function chooseStudentProfilePhotoSource(source: 'camera' | 'library') {
  const input = source === 'camera' ? profileCameraInput.value : profileLibraryInput.value;
  closeModal();
  input?.click();
}
async function submitActivity() {
  if (!currentUser.value || !selectedClassId.value) return;
  if (convertingImages.value) {
    showError('Please wait for the selected images to finish optimizing.');
    return;
  }
  if (activityForm.activityCategory === 'quiz') {
    if (activityForm.quizFileError) {
      showError(activityForm.quizFileError);
      return;
    }
    if (!activityForm.quizData) {
      showError('Please upload a valid JSON format of the quiz.');
      return;
    }
  }
  if (activityForm.materialFileError) {
    showError(activityForm.materialFileError);
    return;
  }
  if (activityForm.petaOutputError) {
    showError(activityForm.petaOutputError);
    return;
  }
  busy.value = true;
  try {
    const payload: Parameters<typeof saveActivity>[1] = {
      classId: selectedClassId.value,
      title: activityForm.title,
      description: activityForm.description,
      dueDate: activityForm.dueDate ? Timestamp.fromDate(new Date(`${activityForm.dueDate}T23:59:59`)) : null,
      totalPoints: Number(activityForm.totalPoints),
      activityCategory: activityForm.activityCategory,
      materials: activityForm.existingMaterials,
      petaOutputs: activityForm.activityCategory === 'peta' ? activityForm.existingPetaOutputs : [],
      petaOutput: null,
    };
    if (activityForm.activityCategory === 'quiz' && activityForm.quizData) {
      payload.quizData = activityForm.quizData;
    }
    const isEdit = Boolean(editingActivityId.value);
    const activityId = await saveActivity(currentUser.value.uid, payload, editingActivityId.value || undefined);
    if (activityForm.materialFiles.length) {
      const uploaded = await uploadActivityMaterials(activityId, activityForm.materialFiles);
      payload.materials = [...activityForm.existingMaterials, ...uploaded];
      await saveActivity(currentUser.value.uid, payload, activityId);
    }
    if (activityForm.activityCategory === 'peta' && activityForm.petaOutputFiles.length) {
      const uploadedOutputs = await uploadActivityMaterials(activityId, activityForm.petaOutputFiles);
      payload.petaOutputs = [...activityForm.existingPetaOutputs, ...uploadedOutputs];
      await saveActivity(currentUser.value.uid, payload, activityId);
    }
    resetActivityForm();
    await loadClassData();
    closeModal();
    showMessage(isEdit ? 'Activity updated successfully.' : 'Activity created successfully.');
  } catch (value) { showError(value); } finally { busy.value = false; }
}
function requestAttachedFileRemoval(activity: ActivityRecord, material: ActivityMaterial, kind: 'material' | 'peta-output') {
  pendingMaterialRemoval.value = {activity, material, kind};
  openModal('remove-material');
}
async function confirmAttachedFileRemoval() {
  const pending = pendingMaterialRemoval.value;
  if (!pending) return;
  busy.value = true;
  try {
    await removeActivityMaterial(pending.activity.id, pending.material, pending.kind);
    await loadClassData();
    const fileName = pending.material.fileName;
    closeModal();
    showMessage(`${fileName} was removed. You can upload a replacement by editing the activity.`);
  } catch (value) {
    showError(value);
  } finally {
    busy.value = false;
  }
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

function startQuiz(activity: ActivityRecord) {
  closeMobileMenu(false);
  takingQuiz.value = activity;
  quizAnswers.value = {};
  quizSubmitted.value = false;
  quizScore.value = 0;
  quizQuestionError.value = '';
  resetQuizQuestionFlow();
  router.push(`/student/activities/${activity.id}/take`);
}

function returnToActivities() {
  modal.value = null;
  quizAnswers.value = {};
  takingQuiz.value = null;
  quizSubmitted.value = false;
  quizQuestionError.value = '';
  resetQuizQuestionFlow();
  router.push('/student/activities');
}

function requestQuizExit() {
  if (quizSubmitted.value) {
    returnToActivities();
    return;
  }
  exitQuizError.value = '';
  modal.value = 'exit-quiz';
}

function serializedQuizAnswers() {
  return Object.fromEntries(Object.entries(quizAnswers.value).map(([key, answer]) => [String(key), String(answer)]));
}

async function confirmQuizExit() {
  if (!takingQuiz.value || !myStudentRecord.value || !takingQuiz.value.quizData) return;
  exitQuizError.value = '';
  busy.value = true;
  const rawScore = scoreQuiz(takingQuiz.value.quizData, quizAnswers.value, takingQuiz.value.totalPoints);
  const plainAnswers = serializedQuizAnswers();
  try {
    await submitStudentQuiz(
      takingQuiz.value.id,
      takingQuiz.value.classId,
      myStudentRecord.value.id,
      rawScore,
      plainAnswers,
      'exited-early',
    );
    const earlyExitSubmission: SubmissionRecord = {
      id: `${takingQuiz.value.id}_${myStudentRecord.value.id}`,
      activityId: takingQuiz.value.id,
      classId: takingQuiz.value.classId,
      studentId: myStudentRecord.value.id,
      status: 'submitted',
      score: rawScore,
      answers: plainAnswers,
      remarks: 'Auto-graded Quiz · Exited early',
    };
    quizSubmitted.value = true;
    mySubmissions.value = [
      ...mySubmissions.value.filter(item => item.activityId !== takingQuiz.value?.id),
      earlyExitSubmission,
    ];
    modal.value = null;
    await router.replace('/student/activities');
    quizAnswers.value = {};
    takingQuiz.value = null;
    quizSubmitted.value = false;
    quizQuestionError.value = '';
    resetQuizQuestionFlow();
    showMessage('Your answers were submitted. This test can no longer be retaken.');
  } catch (value) {
    exitQuizError.value = userFacingError(value);
  } finally {
    busy.value = false;
  }
}

function requestQuizAdvance() {
  quizQuestionError.value = '';
  if (!currentQuizOptionEntries.value.length) {
    quizQuestionError.value = 'This question has no selectable answers. Please ask your teacher to correct the quiz before continuing.';
    return;
  }
  if (!hasCurrentQuizAnswer.value) {
    quizQuestionError.value = 'Select an answer before continuing.';
    return;
  }
  modal.value = isLastQuizQuestion.value ? 'submit-quiz' : 'confirm-next-question';
}

async function confirmQuizAdvance() {
  closeModal();
  quizQuestionError.value = '';
  await advanceQuizQuestion(quizQuestions.value.length);
}

function clearQuizQuestionError() {
  quizQuestionError.value = '';
}

async function finishQuiz() {
  if (!takingQuiz.value || !myStudentRecord.value || !takingQuiz.value.quizData) return;
  const allQuestionsAnswered = quizQuestions.value.every((_question, index) => {
    const answer = quizAnswers.value[String(index)];
    return answer !== undefined && answer !== null;
  });
  if (!quizQuestions.value.length || !allQuestionsAnswered) {
    closeModal();
    quizQuestionError.value = 'Every question must be answered before the quiz can be submitted.';
    return;
  }
  
  const rawScore = scoreQuiz(takingQuiz.value.quizData, quizAnswers.value, takingQuiz.value.totalPoints);
  
  const plainAnswers = serializedQuizAnswers();
  
  busy.value = true;
  try {
    await submitStudentQuiz(takingQuiz.value.id, takingQuiz.value.classId, myStudentRecord.value.id, rawScore, plainAnswers);
    quizScore.value = rawScore;
    quizSubmitted.value = true;
    resetQuizQuestionFlow();
    
    mySubmissions.value = await getStudentSubmissions(myStudentRecord.value.id);
    closeModal();
  } catch (err) {
    showError(err);
  } finally {
    busy.value = false;
  }
}

function reviewStudentQuiz(activity: ActivityRecord) {
  const sub = mySubmissions.value.find(s => s.activityId === activity.id);
  reviewingQuiz.value = activity;
  reviewSubmission.value = sub || null;
  router.push(`/student/activities/${activity.id}/review`);
}

watch([() => route.params.activityId, myActivities, mySubmissions], ([activityId]) => {
  if (typeof activityId !== 'string') return;
  const activity = myActivities.value.find(item => item.id === activityId);
  if (!activity) return;
  const existingSubmission = mySubmissions.value.find(item => item.activityId === activityId);
  if (route.name === 'student-take-quiz' && existingSubmission && !quizSubmitted.value) {
    takingQuiz.value = null;
    quizAnswers.value = {};
    quizQuestionError.value = '';
    resetQuizQuestionFlow();
    router.replace('/student/activities');
    showMessage('This test has already been submitted and cannot be retaken.');
    return;
  }
  if (route.name === 'student-take-quiz' && takingQuiz.value?.id !== activityId) {
    takingQuiz.value = activity;
    quizAnswers.value = {};
    quizSubmitted.value = false;
    quizScore.value = 0;
    quizQuestionError.value = '';
    resetQuizQuestionFlow();
  }
  if (route.name === 'student-review-quiz') {
    reviewingQuiz.value = activity;
    reviewSubmission.value = mySubmissions.value.find(item => item.activityId === activityId) ?? null;
  }
}, {immediate: true});

function isQuestionCorrect(q: QuizQuestion, i: number | string): boolean {
  const studentAns = reviewSubmission.value?.answers?.[i];
  return isCorrectAnswer(q, studentAns);
}

function getOptionClass(q: QuizQuestion, i: number | string, oIndex: number | string, opt: QuizAnswer) {
  const studentAns = reviewSubmission.value?.answers?.[i];
  const correctKey = q.answer ?? q.correctAnswer ?? q.correct;
  
  const isStudentChoice = studentAns !== undefined && studentAns !== null && (
    String(studentAns).trim().toLowerCase() === String(oIndex).trim().toLowerCase() ||
    String(studentAns).trim().toLowerCase() === String(opt).trim().toLowerCase()
  );
  
  const isCorrectChoice = correctKey !== undefined && correctKey !== null && (
    String(correctKey).trim().toLowerCase() === String(oIndex).trim().toLowerCase() ||
    String(correctKey).trim().toLowerCase() === String(opt).trim().toLowerCase()
  );
  
  if (isStudentChoice && isCorrectChoice) {
    return 'quiz-review-correct';
  } else if (isStudentChoice && !isCorrectChoice) {
    return 'quiz-review-incorrect';
  } else if (isCorrectChoice) {
    return 'quiz-review-key';
  }
  return '';
}

</script>

<template>
  <main v-if="!loading && !profile" class="login-shell">
    <section class="login-intro"><div class="brand-mark"><img :src="classTrackSymbol" alt="ClassTrack" /></div><p class="eyebrow">CLASS TRACK</p><h1>Learning, in step together.</h1><p>Access your classes, attendance, activities, scores, and announcements from one connected workspace.</p><div class="feature-list"><span>✓ Live class records</span><span>✓ Shared mobile data</span><span>✓ Unified access</span></div></section>
    <form v-if="authMode === 'login'" class="login-card" @submit.prevent="login"><div><p class="eyebrow">WEB PORTAL</p><h2>Welcome back</h2><p>Sign in with your existing account.</p></div><label>Email<input v-model="email" required type="email" autocomplete="email" placeholder="name@school.edu" /></label><label>Password<input v-model="password" required type="password" autocomplete="current-password" placeholder="••••••••" /></label><p v-if="error" class="alert error">{{ error }}</p><div v-if="error.includes('verify your email')" class="auth-resend"><button type="button" class="auth-link" :disabled="busy" @click="resendVerificationEmail">Resend verification email</button></div><p v-if="!isFirebaseConfigured" class="alert error">Add your Firebase web app values to <code>.env</code> before signing in.</p><button class="primary full" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button><div class="auth-switch"><p>Don't have an account? <button type="button" class="auth-link" @click="switchAuthMode('verify')">Register as student</button></p></div></form>
    <form v-else-if="authMode === 'verify-notice'" class="login-card" @submit.prevent="switchAuthMode('login')"><div><p class="eyebrow">EMAIL VERIFICATION</p><h2>Verify your email</h2><p>A verification link has been sent to <strong>{{ registeredEmailForNotice }}</strong>. Please check your inbox and verify your email address before logging in.</p></div><p v-if="message" class="alert success">{{ message }}</p><p v-if="error" class="alert error">{{ error }}</p><button class="primary full" type="button" @click="switchAuthMode('login')">Go to Sign in</button><div class="auth-switch"><button type="button" class="auth-link" :disabled="busy" @click="resendVerificationEmail">Resend verification link</button></div></form>
    <form v-else-if="authMode === 'verify'" class="login-card" @submit.prevent="verifyStudent"><div><p class="eyebrow">STUDENT VERIFICATION</p><h2>Verify identity</h2><p>Verify your student number and name before registering.</p></div><label>Student Number<input v-model="regStudentNumber" required placeholder="Enter your student number" /></label><label>Full Name<input v-model="regFullName" required placeholder="Enter your full name" /></label><p v-if="error" class="alert error">{{ error }}</p><button class="primary full" :disabled="busy">{{ busy ? 'Verifying identity…' : 'Verify Identity' }}</button><div class="auth-switch"><button type="button" class="auth-link" @click="switchAuthMode('login')">Already have an account? Login</button></div></form>
    <form v-else class="login-card" @submit.prevent="registerStudentAccount"><div><p class="eyebrow">REGISTER EMAIL</p><h2>Register account</h2><p>Create your account for <strong>{{ verifiedRosterStudent?.fullName }}</strong> ({{ verifiedRosterStudent?.studentNumber }})</p></div><label>Email Address<input v-model="regEmail" required type="email" autocomplete="email" placeholder="Enter your email" /></label><label>Password<input v-model="regPassword" required type="password" minlength="6" placeholder="Create a password (min 6 chars)" /></label><label>Confirm Password<input v-model="regConfirmPassword" required type="password" minlength="6" placeholder="Confirm your password" /></label><p v-if="error" class="alert error">{{ error }}</p><button class="primary full" :disabled="busy">{{ busy ? 'Creating account…' : 'Register' }}</button><div class="auth-switch"><button type="button" class="auth-link" @click="switchAuthMode('verify')">← Back to verification</button></div></form>
  </main>
  <main v-else-if="loading" class="loading-page"><div class="spinner"></div><p>Opening your workspace…</p></main>
  <main v-else class="app-shell" :class="{'quiz-mode': profile?.role === 'student' && view === 'take-quiz'}">
    <aside v-if="view !== 'take-quiz'" class="sidebar">
      <div class="mobile-topbar">
        <AppBrand />
        <button ref="mobileMenuButton" class="mobile-menu-button" type="button" aria-label="Open navigation menu" aria-controls="mobile-navigation" :aria-expanded="mobileMenuOpen" @click="openMobileMenu"><span></span><span></span><span></span></button>
      </div>
      <div class="desktop-navigation">
        <AppBrand />
        <nav aria-label="Primary navigation"><button v-for="item in navItems" :key="item.id" :class="{active:view === item.id}" @click="go(item.id)"><i>{{ item.icon }}</i>{{ item.label }}</button></nav>
        <div class="account"><button v-if="profile?.role === 'student'" class="account-profile account-profile-link" type="button" aria-label="Open student profile" @click="go('profile')"><div class="avatar"><img v-if="studentProfilePhotoUrl" :src="studentProfilePhotoUrl" alt="" /><span v-else>{{ profile?.fullName?.slice(0, 1).toUpperCase() || 'U' }}</span></div><div><strong>{{ profile?.fullName || 'User' }}</strong><small>Student</small></div><span class="account-profile-chevron" aria-hidden="true">›</span></button><div v-else class="account-profile"><div class="avatar">{{ profile?.fullName?.slice(0, 1).toUpperCase() || 'U' }}</div><div><strong>{{ profile?.fullName || 'User' }}</strong><small>Teacher</small></div></div><button v-if="profile?.role === 'teacher'" class="account-signout" type="button" @click="openModal('logout')"><span aria-hidden="true">↪</span>Sign out</button></div>
      </div>
    </aside>
    <Transition name="mobile-nav">
      <div v-if="mobileMenuOpen && view !== 'take-quiz'" class="mobile-nav-layer">
        <button class="mobile-nav-backdrop" type="button" aria-label="Close navigation menu" @click="closeMobileMenu()"></button>
        <aside id="mobile-navigation" class="mobile-nav-drawer" aria-label="Mobile navigation">
          <div class="mobile-nav-heading">
            <AppBrand />
            <button ref="mobileMenuCloseButton" class="mobile-menu-close" type="button" aria-label="Close navigation menu" @click="closeMobileMenu()">×</button>
          </div>
          <nav aria-label="Primary navigation"><button v-for="item in navItems" :key="item.id" :class="{active:view === item.id}" @click="selectMobileView(item.id)"><i>{{ item.icon }}</i>{{ item.label }}</button></nav>
          <div class="account"><button v-if="profile?.role === 'student'" class="account-profile account-profile-link" type="button" aria-label="Open student profile" @click="selectMobileView('profile')"><div class="avatar"><img v-if="studentProfilePhotoUrl" :src="studentProfilePhotoUrl" alt="" /><span v-else>{{ profile?.fullName?.slice(0, 1).toUpperCase() || 'U' }}</span></div><div><strong>{{ profile?.fullName || 'User' }}</strong><small>Student</small></div><span class="account-profile-chevron" aria-hidden="true">›</span></button><div v-else class="account-profile"><div class="avatar">{{ profile?.fullName?.slice(0, 1).toUpperCase() || 'U' }}</div><div><strong>{{ profile?.fullName || 'User' }}</strong><small>Teacher</small></div></div><button v-if="profile?.role === 'teacher'" class="account-signout" type="button" @click="openMobileLogout"><span aria-hidden="true">↪</span>Sign out</button></div>
        </aside>
      </div>
    </Transition>
    <section class="workspace"><header v-if="view !== 'take-quiz' && view !== 'profile'"><div><p class="eyebrow">{{ todayLabel }}</p><h1>Good day, {{ userName }}</h1><p v-if="profile?.role === 'student'" class="student-academic-context"><span>{{ studentAcademicLabel }}</span></p></div><div class="header-actions"><select v-if="view !== 'classes' && classes.length" v-model="selectedClassId" aria-label="Select class"><option v-for="item in classes" :key="item.id" :value="item.id">{{ item.className }} · {{ item.section }}</option></select><button class="icon-button" title="Refresh" @click="loadPortal">↻</button></div></header>
      <div v-if="error" class="alert error">{{ error }}</div><div v-if="message" class="alert success">{{ message }}</div>
      <template v-if="profile?.role === 'teacher'">
      <section v-if="view === 'dashboard'" class="page"><div class="hero-card"><div><p class="eyebrow">TODAY'S PULSE</p><h2>{{ selectedClass ? selectedClass.className : 'Start your class workspace' }}</h2><p>{{ selectedClass ? `${students.length} enrolled learners · ${todayLabel}` : 'Create a class to start managing student records.' }}</p><button class="light-button" @click="go('attendance')">Take attendance <span>→</span></button></div><div class="hero-orb">{{ todaySummary.present || 0 }}<small>present</small></div></div><div class="stat-grid"><article><span class="stat-icon blue">♙</span><div><strong>{{ students.length }}</strong><small>Students</small></div></article><article><span class="stat-icon green">✓</span><div><strong>{{ todaySummary.present || 0 }}</strong><small>Present today</small></div></article><article><span class="stat-icon orange">◷</span><div><strong>{{ todaySummary.late || 0 }}</strong><small>Late today</small></div></article><article><span class="stat-icon red">—</span><div><strong>{{ todaySummary.absent || 0 }}</strong><small>Absent today</small></div></article></div><div class="section-grid"><article class="panel"><div class="panel-title"><h3>Quick actions</h3></div><div class="quick-grid"><button @click="go('attendance')"><b>✓</b>Take attendance</button><button @click="openModal('activity')"><b>＋</b>Create activity</button><button @click="openModal('student')"><b>♙</b>Add student</button><button @click="openModal('announcement')"><b>◉</b>Post announcement</button></div></article><article class="panel"><div class="panel-title"><h3>Upcoming activities</h3><button class="text-button" @click="go('activities')">View all</button></div><div v-if="activeActivities.length" class="compact-list"><div v-for="item in activeActivities.slice(0, 4)" :key="item.id"><span class="date-square">{{ isoDate(item.dueDate).split(' ')[1] || '—' }}</span><div><strong>{{ item.title }}</strong><small>Due {{ isoDate(item.dueDate) }}</small></div><b>{{ item.totalPoints }} pts</b></div></div><p v-else class="empty-copy">No open activities for this class.</p></article></div></section>
      <section v-else-if="view === 'classes'" class="page"><div class="page-heading"><div><h2>Your classes</h2><p>Organize the subjects and sections you teach.</p></div><button class="primary" @click="openNewClass">＋ Add class</button></div><div v-if="classes.length" class="class-grid"><article v-for="item in classes" :key="item.id" class="class-card" :class="{selected:item.id === selectedClassId}" @click="selectedClassId = item.id"><div class="class-card-top"><span>{{ item.subject || 'Subject' }}</span><b>→</b></div><h3>{{ item.className }}</h3><p>{{ item.gradeLevel }} · {{ item.section }}</p><footer><span>{{ item.schedule || 'Schedule not set' }}</span><span>{{ item.id === selectedClassId ? students.length : 'Open' }} students</span></footer><div class="class-card-actions" aria-label="Class actions"><button type="button" @click.stop="openClassEditor(item)">Edit</button><button type="button" @click.stop="requestClassAction(item, 'archive')">Archive</button><button type="button" class="danger" @click.stop="requestClassAction(item, 'delete')">Delete</button></div></article></div><div v-else class="empty-state"><b>▦</b><h3>Your classes will appear here</h3><p>Create your first class to unlock attendance, activities, and student records.</p><button class="primary" @click="openNewClass">Create a class</button></div></section>
      <section v-else-if="view === 'students'" class="page"><div class="page-heading"><div><h2>{{ selectedClass ? selectedClass.className : 'Students' }}</h2><p>{{ students.length }} active students enrolled in this class.</p></div><button class="primary" :disabled="!selectedClass" @click="openModal('student')">＋ Add student</button></div><div v-if="students.length" class="panel table-panel"><table><thead><tr><th>Student</th><th>Student number</th><th>Contact</th><th>Guardian</th><th></th></tr></thead><tbody><tr v-for="student in students" :key="student.id"><td><div class="student-cell"><span class="avatar small">{{ student.fullName.slice(0, 1) }}</span><div><strong>{{ student.fullName }}</strong><small>{{ student.email || 'No email added' }}</small></div></div></td><td>{{ student.studentNumber }}</td><td>{{ student.contactNumber || '—' }}</td><td>{{ student.guardianName || '—' }}</td><td><button class="text-button danger" @click="archive(student.id)">Archive</button></td></tr></tbody></table></div><div v-else class="empty-state"><b>♙</b><h3>No students yet</h3><p>Add learners to {{ selectedClass?.className || 'your class' }} to begin.</p></div></section>
      <section v-else-if="view === 'attendance'" class="page"><div class="page-heading"><div><h2>Daily attendance</h2><p>Mark the attendance status for each learner.</p></div><div class="inline-actions"><input v-model="attendanceDate" type="date" /><button class="primary" :disabled="!students.length || busy" @click="submitAttendance">Save attendance</button></div></div><div v-if="students.length" class="panel attendance-list"><div v-for="student in students" :key="student.id" class="attendance-row"><div class="student-cell"><span class="avatar small">{{ student.fullName.slice(0, 1) }}</span><div><strong>{{ student.fullName }}</strong><small>{{ student.studentNumber }}</small></div></div><div class="status-pills"><button v-for="status in attendanceStatuses" :key="status" :class="[status,{selected:(attendance[student.id]?.status || 'present') === status}]" @click="setAttendance(student.id, status)">{{ status }}</button></div><input v-model="attendance[student.id].remarks" aria-label="Remarks" placeholder="Remarks (optional)" /></div></div><div v-else class="empty-state"><b>✓</b><h3>No students to mark</h3><p>Add students to this class first.</p></div></section>
      <section v-else-if="view === 'activities'" class="page">
        <div class="page-heading"><div><h2>Activities & scores</h2><p>Create assessments and record learner scores.</p></div><button class="primary" :disabled="!selectedClass" @click="openModal('activity')">＋ Create activity</button></div>
        <div v-if="activities.length" class="activity-grid">
          <article v-for="item in activities" :key="item.id" class="activity-card">
            <div><span :class="['tag', item.status]">{{ item.status }}</span><span class="tag">{{ activityCategoryLabel(item) }}</span><span v-if="item.quizData" class="tag" style="background: #eef4ff; color: #2563eb;">JSON Quiz</span><span class="points">{{ item.totalPoints }} points</span></div>
            <h3>{{ item.title }}</h3><p>{{ item.description || 'No description provided.' }}</p>
            <div v-if="petaOutputsFor(item).length || item.materials?.length" class="activity-assets">
              <details v-if="petaOutputsFor(item).length" class="asset-group output-group">
                <summary><span class="asset-summary-icon" aria-hidden="true">▧</span><span><strong>PETA output examples</strong><small>Reference images</small></span><b>{{ petaOutputsFor(item).length }}</b></summary>
                <div class="asset-downloads teacher-asset-downloads">
                  <div v-for="(output, outputIndex) in petaOutputsFor(item)" :key="output.id" class="asset-download-row">
                    <button type="button" class="asset-download-button" :disabled="downloadingMaterialId !== null" :title="output.fileName" :aria-label="`Download ${output.fileName} as ${shortDownloadName('PETA', outputIndex)}`" @click="downloadAttachment(output, 'PETA', outputIndex)"><span aria-hidden="true">{{ downloadingMaterialId === output.id ? '…' : '↓' }}</span><span>{{ shortDownloadName('PETA', outputIndex) }}</span></button>
                    <button type="button" class="asset-remove" :disabled="busy" :aria-label="`Remove ${output.fileName}`" title="Remove attached file" @click="requestAttachedFileRemoval(item, output, 'peta-output')">×</button>
                  </div>
                </div>
              </details>
              <details v-if="item.materials?.length" class="asset-group resource-group">
                <summary><span class="asset-summary-icon" aria-hidden="true">▤</span><span><strong>Learning resources</strong><small>Images and HTML files</small></span><b>{{ item.materials.length }}</b></summary>
                <div class="asset-downloads teacher-asset-downloads">
                  <div v-for="(material, materialIndex) in item.materials" :key="material.id" class="asset-download-row">
                    <button type="button" class="asset-download-button" :disabled="downloadingMaterialId !== null" :title="material.fileName" :aria-label="`Download ${material.fileName} as ${shortDownloadName('RES', materialIndex)}`" @click="downloadAttachment(material, 'RES', materialIndex)"><span aria-hidden="true">{{ downloadingMaterialId === material.id ? '…' : materialKind(material) === 'HTML' ? '⌘' : '↓' }}</span><span>{{ shortDownloadName('RES', materialIndex) }}</span></button>
                    <button type="button" class="asset-remove" :disabled="busy" :aria-label="`Remove ${material.fileName}`" title="Remove attached file" @click="requestAttachedFileRemoval(item, material, 'material')">×</button>
                  </div>
                </div>
              </details>
            </div>
            <footer><span>Due {{ isoDate(item.dueDate) }}</span><div><button class="text-button" @click="openEditActivity(item)">Edit</button><button class="text-button" @click="openScores(item)">Scores</button><button v-if="item.quizData" class="text-button" @click="selectedAnswerKey = item; modal = 'answer-key'">Answer Key</button><button v-if="item.status === 'active'" class="text-button danger" @click="close(item.id)">Close</button></div></footer>
          </article>
        </div>
        <div v-else class="empty-state"><b>◈</b><h3>No activities yet</h3><p>Create an activity to share it with students and begin recording scores.</p></div>
      </section>
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
                <span v-if="studentScoreViewingEnabled" class="points">{{ mySubmissions.find(s => s.activityId === item.id)?.score ?? '?' }} / {{ item.totalPoints }} pts</span>
              </div>
              <h3>{{ item.title }}</h3><p>{{ item.description || 'No description provided.' }}</p>
              <div v-if="petaOutputsFor(item).length || item.materials?.length" class="activity-assets">
                <details v-if="petaOutputsFor(item).length" class="asset-group output-group">
                  <summary><span class="asset-summary-icon" aria-hidden="true">▧</span><span><strong>PETA output examples</strong><small>One-click downloads</small></span><b>{{ petaOutputsFor(item).length }}</b></summary>
                  <div class="asset-downloads">
                    <button v-for="(output, outputIndex) in petaOutputsFor(item)" :key="output.id" type="button" class="asset-download-button" :disabled="downloadingMaterialId !== null" :title="output.fileName" :aria-label="`Download ${output.fileName} as ${shortDownloadName('PETA', outputIndex)}`" @click="downloadAttachment(output, 'PETA', outputIndex)"><span aria-hidden="true">{{ downloadingMaterialId === output.id ? '…' : '↓' }}</span><span>{{ shortDownloadName('PETA', outputIndex) }}</span></button>
                  </div>
                </details>
                <details v-if="item.materials?.length" class="asset-group resource-group">
                  <summary><span class="asset-summary-icon" aria-hidden="true">▤</span><span><strong>Learning resources</strong><small>One-click downloads</small></span><b>{{ item.materials.length }}</b></summary>
                  <div class="asset-downloads">
                    <button v-for="(material, materialIndex) in item.materials" :key="material.id" type="button" class="asset-download-button" :disabled="downloadingMaterialId !== null" :title="material.fileName" :aria-label="`Download ${material.fileName} as ${shortDownloadName('RES', materialIndex)}`" @click="downloadAttachment(material, 'RES', materialIndex)"><span aria-hidden="true">{{ downloadingMaterialId === material.id ? '…' : materialKind(material) === 'HTML' ? '⌘' : '↓' }}</span><span>{{ shortDownloadName('RES', materialIndex) }}</span></button>
                  </div>
                </details>
              </div>
              <footer>
                <span>Due {{ isoDate(item.dueDate) }}</span>
                <div v-if="mySubmissions.find(s => s.activityId === item.id)?.remarks">Remarks: {{ mySubmissions.find(s => s.activityId === item.id)?.remarks }}</div>
                <button v-if="studentScoreViewingEnabled && item.quizData && mySubmissions.find(s => s.activityId === item.id)" class="secondary small" style="margin-left: auto; padding: 4px 12px; font-size: 13px;" @click="reviewStudentQuiz(item)">View Results</button>
                <button v-else-if="item.quizData && item.status === 'active' && !mySubmissions.find(s => s.activityId === item.id)" class="primary small" style="margin-left: auto; padding: 4px 12px; font-size: 13px;" @click="startQuiz(item)">Take the Test</button>
              </footer>
            </article>
          </div>
          <div v-else class="empty-state"><b>◈</b><h3>No activities yet</h3><p>You have no activities assigned across your classes.</p></div>
        </section>
        
        <section v-else-if="view === 'attendance'" class="page">
          <div class="page-heading"><div><h2>My Attendance</h2><p>Your attendance history across classes.</p></div></div>
          <div class="stat-grid attendance-stat-grid" aria-label="Attendance summary">
            <article><span class="stat-icon green" aria-hidden="true">✓</span><div><strong>{{ studentAttendanceSummary.present }}</strong><small>Present</small></div></article>
            <article><span class="stat-icon red" aria-hidden="true">—</span><div><strong>{{ studentAttendanceSummary.absent }}</strong><small>Absent</small></div></article>
            <article><span class="stat-icon purple" aria-hidden="true">◇</span><div><strong>{{ studentAttendanceSummary.excused }}</strong><small>Excused</small></div></article>
          </div>
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

        <section v-else-if="view === 'profile'" class="page student-profile-page">
          <div class="page-heading"><div><p class="eyebrow">STUDENT ACCOUNT</p><h2>My profile</h2><p>Your identity, enrollment, and contact information.</p></div><div class="profile-page-actions"><button class="profile-edit-button" type="button" :disabled="!myStudentRecord" @click="openStudentProfileEditor"><span aria-hidden="true">✎</span>Edit profile</button><button class="profile-signout-button" type="button" @click="openModal('logout')"><span aria-hidden="true">↪</span>Sign out</button></div></div>
          <article class="student-profile-hero">
            <button class="student-profile-avatar-upload" :class="{uploading: profilePhotoUploading}" type="button" aria-label="Update profile photo" :disabled="!myStudentRecord || profilePhotoUploading" @click="openModal('profile-photo')">
              <span class="student-profile-avatar">
                <img v-if="studentProfilePhotoUrl" :src="studentProfilePhotoUrl" alt="Student profile photo" />
                <span v-else aria-hidden="true">{{ (myStudentRecord?.fullName || profile?.fullName || 'S').slice(0, 1).toUpperCase() }}</span>
              </span>
              <span class="profile-photo-action" aria-hidden="true">{{ profilePhotoUploading ? '…' : 'photo_camera' }}</span>
            </button>
            <input ref="profileCameraInput" class="profile-photo-input" type="file" accept="image/*" capture="user" aria-label="Take a profile photo with the camera" @change="handleStudentProfilePhoto" />
            <input ref="profileLibraryInput" class="profile-photo-input" type="file" accept="image/*" aria-label="Choose a profile photo from this device" @change="handleStudentProfilePhoto" />
            <div><span class="tag active">Active student</span><h3>{{ myStudentRecord?.fullName || profile?.fullName || 'Student' }}</h3><p>{{ myStudentRecord?.studentNumber || 'Student number not assigned' }}</p></div>
          </article>
          <div class="student-profile-grid">
            <article class="panel student-profile-card"><div class="profile-card-heading"><span aria-hidden="true">♙</span><div><h3>Student information</h3><p>Your school identity and contact details.</p></div></div><dl><div><dt>Full name</dt><dd>{{ myStudentRecord?.fullName || profile?.fullName || 'Not provided' }}</dd></div><div><dt>Student number</dt><dd>{{ myStudentRecord?.studentNumber || 'Not provided' }}</dd></div><div><dt>Email address</dt><dd>{{ signedInEmail || myStudentRecord?.email || 'Not provided' }}</dd></div><div><dt>Contact number</dt><dd>{{ myStudentRecord?.contactNumber || 'Not provided' }}</dd></div><div><dt>Date of birth</dt><dd>{{ myStudentRecord?.dateOfBirth || 'Not provided' }}</dd></div><div><dt>Gender</dt><dd>{{ myStudentRecord?.gender || 'Not provided' }}</dd></div></dl></article>
            <article class="panel student-profile-card"><div class="profile-card-heading"><span aria-hidden="true">▦</span><div><h3>Academic enrollment</h3><p>Your active grade, section, and classes.</p></div></div><dl><div><dt>Grade and section</dt><dd>{{ studentAcademicLabel }}</dd></div><div><dt>Active classes</dt><dd>{{ myClasses.length }}</dd></div></dl><div v-if="myClasses.length" class="profile-class-list"><div v-for="classRecord in myClasses" :key="classRecord.id"><span><strong>{{ classRecord.className }}</strong><small>{{ classRecord.subject }}</small></span><b>{{ classRecord.gradeLevel }} · {{ classRecord.section }}</b></div></div><p v-else class="profile-empty-note">No active classes are currently assigned.</p></article>
            <article class="panel student-profile-card"><div class="profile-card-heading"><span aria-hidden="true">♢</span><div><h3>Guardian information</h3><p>Emergency and guardian contact on record.</p></div></div><dl><div><dt>Guardian name</dt><dd>{{ myStudentRecord?.guardianName || 'Not provided' }}</dd></div><div><dt>Guardian contact</dt><dd>{{ myStudentRecord?.guardianContact || 'Not provided' }}</dd></div></dl></article>
          </div>
        </section>

        <section v-else-if="view === 'take-quiz' && takingQuiz" class="page quiz-page">
          <header class="quiz-test-header">
            <div class="quiz-test-topbar">
              <div class="quiz-brand"><div class="brand-mark"><img :src="classTrackSymbol" alt="" /></div><span>PORTAL</span></div>
              <button class="secondary" type="button" @click="requestQuizExit">{{ quizSubmitted ? 'Back to Activities' : 'Exit test' }}</button>
            </div>
            <div class="quiz-test-summary">
              <p class="eyebrow">{{ quizSubmitted ? 'TEST COMPLETE' : 'TAKE THE TEST' }}</p>
              <h1>{{ takingQuiz.title }}</h1>
              <p>{{ takingQuiz.description || 'Answer the questions below to complete the quiz.' }}</p>
              <div v-if="!quizSubmitted" class="quiz-test-meta"><span>Question {{ Math.min(currentQuizQuestionIndex + 1, Math.max(quizQuestions.length, 1)) }} of {{ quizQuestions.length }}</span><span>{{ currentQuizQuestionIndex }} completed</span><span>{{ takingQuiz.totalPoints }} points</span></div>
              <div v-if="!quizSubmitted" class="quiz-answer-progress" aria-hidden="true"><span :style="{width: `${lockedQuizProgress}%`}"></span></div>
            </div>
          </header>
          
          <div v-if="!quizSubmitted" class="panel quiz-panel">
            <div v-if="quizQuestions.length === 0" style="padding: 24px; background: #fff5f5; color: #b91c1c; border-radius: 8px;">
              <strong>Could not load questions.</strong>
              <p>The uploaded JSON format might not be supported. Expected an array of questions or an object containing a 'questions' array. Please ask your teacher to check the quiz file.</p>
              <pre style="margin-top: 12px; font-size: 11px; white-space: pre-wrap; word-break: break-all; color: #475569;">Debug Info: {{ takingQuiz.quizData }}</pre>
            </div>
            <div v-else-if="currentQuizQuestion">
              <div ref="quizQuestionCard" :key="currentQuizQuestionIndex" class="quiz-question-card quiz-current-question" tabindex="-1">
                <p class="quiz-current-label">Question {{ currentQuizQuestionIndex + 1 }} of {{ quizQuestions.length }}</p>
                <h3>{{ currentQuizQuestion.question || currentQuizQuestion.text || 'Unknown question format' }}</h3>
                <div class="quiz-options">
                  <label v-for="([optionKey, opt]) in currentQuizOptionEntries" :key="optionKey" :class="['quiz-option', {'selected': String(quizAnswers[currentQuizQuestionIndex]) === optionKey}]">
                    <input type="radio" :name="'quiz_q' + currentQuizQuestionIndex" :value="optionKey" v-model="quizAnswers[currentQuizQuestionIndex]" @change="clearQuizQuestionError" />
                    <span>{{ opt }}</span>
                  </label>
                </div>
                <div v-if="!currentQuizOptionEntries.length" class="quiz-question-error" role="alert"><strong>Question cannot be answered.</strong><span>This question has no selectable options. Please ask your teacher to correct the quiz.</span></div>
              </div>
              <p v-if="quizQuestionError" class="quiz-question-feedback" role="alert">{{ quizQuestionError }}</p>
              <div class="quiz-page-actions">
                <button class="primary" style="padding: 0 32px;" type="button" :disabled="busy || !hasCurrentQuizAnswer || !currentQuizOptionEntries.length" @click="requestQuizAdvance">{{ isLastQuizQuestion ? 'Submit quiz' : 'Next question' }}</button>
              </div>
            </div>
          </div>
          
          <div v-else class="panel" style="text-align: center; padding: 64px 20px;">
            <div style="font-size: 64px; margin-bottom: 24px;">🎉</div>
            <h2 style="font-size: 32px;">Quiz Completed!</h2>
            <p style="font-size: 20px; margin-top: 12px; color: #475569;">Your score is <strong>{{ quizScore }} / {{ takingQuiz.totalPoints }}</strong></p>
            <button class="primary" style="margin-top: 32px; font-size: 16px; padding: 12px 32px;" @click="returnToActivities">Back to Activities</button>
          </div>
        </section>

        <section v-else-if="view === 'review-quiz' && reviewingQuiz" class="page">
          <div class="page-heading">
            <div>
              <p class="eyebrow">QUIZ RESULTS & REVIEW</p>
              <h2>{{ reviewingQuiz.title }}</h2>
              <p>{{ reviewingQuiz.description || 'Review your submitted answers and correct solutions below.' }}</p>
            </div>
            <button class="secondary" @click="view = 'activities'">Back to Activities</button>
          </div>

          <div class="panel" style="padding: 24px 32px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #1e293b, #0f172a); color: white; border-radius: 16px;">
            <div>
              <p style="margin: 0 0 4px 0; color: #94a3b8; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">FINAL SCORE</p>
              <h2 style="margin: 0; font-size: 28px; color: white;">{{ reviewSubmission?.score ?? 0 }} / {{ reviewingQuiz.totalPoints }} <span style="font-size: 16px; font-weight: 500; color: #cbd5e1;">points</span></h2>
            </div>
            <div style="text-align: right;">
              <span class="tag" style="background: rgba(255,255,255,0.15); color: white; padding: 6px 14px; font-size: 13px; text-transform: uppercase;">{{ reviewSubmission?.status || 'Submitted' }}</span>
            </div>
          </div>
          
          <div class="panel" style="padding: 32px;">
            <div v-if="extractQuestions(reviewingQuiz.quizData).length === 0" style="padding: 24px; background: #fff5f5; color: #b91c1c; border-radius: 8px;">
              <strong>Could not load quiz questions.</strong>
            </div>
            <div v-else>
              <div v-for="(q, i) in extractQuestions(reviewingQuiz.quizData)" :key="i" class="quiz-question-card">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px;">
                  <h3 style="margin: 0; font-size: 18px; line-height: 1.4;">{{ Number(i) + 1 }}. {{ q.question || q.text || 'Unknown question format' }}</h3>
                  <span v-if="reviewSubmission?.answers?.[i] === undefined || reviewSubmission?.answers?.[i] === null" class="badge-tag" style="background: #f1f5f9; color: #64748b;">Not Answered</span>
                  <span v-else-if="isQuestionCorrect(q, i)" class="badge-tag correct">✓ Correct</span>
                  <span v-else class="badge-tag incorrect">✗ Incorrect</span>
                </div>
                <div class="quiz-options">
                  <div v-for="(opt, oIndex) in (q.options || q.choices || [])" :key="oIndex" :class="['quiz-option', getOptionClass(q, i, oIndex, opt)]">
                    <span>{{ opt }}</span>
                    <span v-if="getOptionClass(q, i, oIndex, opt) === 'quiz-review-correct'" class="badge-tag correct">✓ Your Answer (Correct)</span>
                    <span v-else-if="getOptionClass(q, i, oIndex, opt) === 'quiz-review-incorrect'" class="badge-tag incorrect">✗ Your Answer</span>
                    <span v-else-if="getOptionClass(q, i, oIndex, opt) === 'quiz-review-key'" class="badge-tag key">✓ Correct Answer</span>
                  </div>
                </div>
              </div>

              <div style="margin-top: 32px; display: flex; justify-content: flex-end;">
                <button class="primary" style="padding: 0 32px;" @click="view = 'activities'">Back to Activities</button>
              </div>
            </div>
          </div>
        </section>

      </template>
    </section>
  </main>

  <div v-if="modal" class="modal-backdrop" @click.self="closeModal"><form v-if="modal === 'class'" class="modal-card" @submit.prevent="submitClass"><div class="modal-title"><div><p class="eyebrow">{{ editingClassId ? 'EDIT CLASS' : 'NEW CLASS' }}</p><h2>{{ editingClassId ? 'Update class' : 'Create a class' }}</h2></div><button type="button" class="icon-button" @click="closeModal">×</button></div><label>Class name<input v-model="classForm.className" required placeholder="e.g. ICT 10" /></label><div class="form-grid"><label>Subject<input v-model="classForm.subject" required placeholder="Information Technology" /></label><label>Grade level<input v-model="classForm.gradeLevel" required placeholder="Grade 10" /></label></div><div class="form-grid"><label>Section<input v-model="classForm.section" required placeholder="Section A" /></label><label>Schedule<input v-model="classForm.schedule" placeholder="Mon · 9:00 AM" /></label></div><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">{{ busy ? 'Saving…' : editingClassId ? 'Save changes' : 'Create class' }}</button></div></form>
    <form v-else-if="modal === 'class-action' && pendingClassAction" class="modal-card class-action-modal" @submit.prevent="confirmClassAction"><div class="modal-title"><div><p class="eyebrow">{{ pendingClassAction.action === 'archive' ? 'ARCHIVE CLASS' : 'PERMANENT ACTION' }}</p><h2>{{ pendingClassAction.action === 'archive' ? 'Archive this class?' : 'Delete this class?' }}</h2></div><button type="button" class="icon-button" aria-label="Close class action dialog" :disabled="busy" @click="closeModal">×</button></div><div class="class-action-summary"><strong>{{ pendingClassAction.classRecord.className }}</strong><span>{{ pendingClassAction.classRecord.subject }} · {{ pendingClassAction.classRecord.section }}</span></div><p v-if="pendingClassAction.action === 'archive'">The class will disappear from your active workspace, but its records will be preserved.</p><template v-else><p>This permanently removes the class, its activities, submissions, attendance, announcements, uploaded resources, and class membership from enrolled students.</p><label>Type <strong>DELETE</strong> to continue<input v-model="classActionConfirmation" autocomplete="off" placeholder="DELETE" /></label></template><div class="modal-actions"><button type="button" class="secondary" :disabled="busy" @click="closeModal">Cancel</button><button :class="pendingClassAction.action === 'delete' ? 'danger-button' : 'primary'" :disabled="busy || (pendingClassAction.action === 'delete' && classActionConfirmation !== 'DELETE')">{{ busy ? 'Working…' : pendingClassAction.action === 'archive' ? 'Archive class' : 'Delete permanently' }}</button></div></form>
    <form v-else-if="modal === 'student'" class="modal-card" @submit.prevent="submitStudent"><div class="modal-title"><div><p class="eyebrow">NEW STUDENT</p><h2>Enroll a student</h2></div><button type="button" class="icon-button" @click="closeModal">×</button></div><div class="form-grid"><label>Student number<input v-model="studentForm.studentNumber" required /></label><label>Full name<input v-model="studentForm.fullName" required /></label></div><div class="form-grid"><label>Email<input v-model="studentForm.email" type="email" /></label><label>Contact number<input v-model="studentForm.contactNumber" /></label></div><div class="form-grid"><label>Guardian name<input v-model="studentForm.guardianName" /></label><label>Guardian contact<input v-model="studentForm.guardianContact" /></label></div><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">Enroll student</button></div></form>
    <form v-else-if="modal === 'edit-profile' && myStudentRecord" class="modal-card student-profile-modal" @submit.prevent="submitStudentProfile"><div class="modal-title"><div><p class="eyebrow">PROFILE INFORMATION</p><h2>Edit your profile</h2><p>Update the contact details you manage.</p></div><button type="button" class="icon-button" aria-label="Close edit profile dialog" :disabled="busy" @click="closeModal">×</button></div><div class="profile-readonly-note"><span aria-hidden="true">ⓘ</span><p>Your name, student number, sign-in email, grade, section, and enrollment are managed by your school.</p></div><label>Contact number<input v-model.trim="studentProfileForm.contactNumber" type="tel" autocomplete="tel" placeholder="Enter your contact number" /></label><div class="form-grid"><label>Date of birth<input v-model="studentProfileForm.dateOfBirth" type="date" :max="attendanceDate" /></label><label>Gender<select v-model="studentProfileForm.gender"><option value="">Prefer not to specify</option><option value="Female">Female</option><option value="Male">Male</option><option value="Non-binary">Non-binary</option><option value="Prefer not to say">Prefer not to say</option></select></label></div><div class="form-grid"><label>Guardian name<input v-model.trim="studentProfileForm.guardianName" autocomplete="name" placeholder="Enter guardian name" /></label><label>Guardian contact<input v-model.trim="studentProfileForm.guardianContact" type="tel" autocomplete="tel" placeholder="Enter guardian contact" /></label></div><div class="modal-actions"><button type="button" class="secondary" :disabled="busy" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save profile' }}</button></div></form>
    <form v-else-if="modal === 'profile-photo'" class="modal-card profile-photo-modal" @submit.prevent><div class="modal-title"><div><p class="eyebrow">PROFILE PHOTO</p><h2>Update your photo</h2><p>Choose how you want to add your profile image.</p></div><button type="button" class="icon-button" aria-label="Close profile photo options" @click="closeModal">×</button></div><div class="profile-photo-options"><button type="button" @click="chooseStudentProfilePhotoSource('camera')"><span class="profile-photo-option-icon" aria-hidden="true">photo_camera</span><span><strong>Take photo</strong><small>Open the camera on this device</small></span><b aria-hidden="true">›</b></button><button type="button" @click="chooseStudentProfilePhotoSource('library')"><span class="profile-photo-option-icon" aria-hidden="true">image</span><span><strong>Choose from device</strong><small>Upload an existing image</small></span><b aria-hidden="true">›</b></button></div><p class="profile-photo-help">Images must be 5 MB or smaller. They are automatically optimized before upload.</p></form>
    <form v-else-if="modal === 'activity'" class="modal-card activity-modal" @submit.prevent="submitActivity">
      <div class="modal-title"><div><p class="eyebrow">{{ editingActivityId ? 'EDIT ACTIVITY' : 'NEW ACTIVITY' }}</p><h2>{{ editingActivityId ? 'Edit activity' : 'Create an activity' }}</h2><p>Set the activity details and attach everything students need.</p></div><button type="button" class="icon-button" :disabled="convertingImages" @click="closeModal">×</button></div>
      <div class="activity-form-body">
        <section class="activity-details-column">
          <div class="activity-column-heading"><span aria-hidden="true">✎</span><div><strong>Activity details</strong><small>Instructions, schedule, and grading</small></div></div>
          <label>Title<input v-model="activityForm.title" required placeholder="e.g. Web design quiz" /></label>
          <label>Category<select v-model="activityForm.activityCategory"><option value="peta">PETA</option><option value="quiz">Quiz</option><option value="coding">Coding</option></select></label>
          <label>Description<textarea v-model="activityForm.description" placeholder="Instructions for students"></textarea></label>
          <div v-if="activityForm.activityCategory === 'quiz'" class="quiz-file-upload"><label>Quiz JSON file <small v-if="activityForm.quizData">(Optional if keeping existing JSON)</small><input type="file" accept=".json,application/json" @change="handleQuizFileUpload" :required="!activityForm.quizData" /></label><p v-if="activityForm.quizFileName" class="file-success">✓ {{ activityForm.quizFileName }}</p><p v-if="activityForm.quizFileError" class="alert error">{{ activityForm.quizFileError }}</p></div>
          <div class="form-grid"><label>Due date<input v-model="activityForm.dueDate" type="date" /></label><label>Total points<input v-model.number="activityForm.totalPoints" required min="1" type="number" /></label></div>
        </section>
        <section class="activity-assets-column">
          <div class="activity-column-heading"><span aria-hidden="true">⇧</span><div><strong>Attachments</strong><small>Outputs and learning resources</small></div></div>
          <section v-if="activityForm.activityCategory === 'peta'" class="material-upload peta-output-upload">
            <div><strong>PETA output images</strong><small>Upload expected or sample outputs that students can download. Images are automatically optimized to WebP.</small></div>
            <label class="material-picker"><input type="file" accept="image/*" multiple @change="handlePetaOutputFile" /><span aria-hidden="true">＋</span>Choose images</label>
            <div v-if="activityForm.existingPetaOutputs.length || activityForm.petaOutputFiles.length" class="material-file-list"><div v-for="output in activityForm.existingPetaOutputs" :key="output.id" class="material-file"><span class="material-file-icon">▧</span><div><strong>{{ output.fileName }}</strong><small>Image · {{ formatFileSize(output.size) }}</small></div><span class="material-saved">Saved</span></div><div v-for="(file, index) in activityForm.petaOutputFiles" :key="`${file.name}-${file.lastModified}`" class="material-file"><span class="material-file-icon">▧</span><div><strong>{{ file.name }}</strong><small>Image · {{ formatFileSize(file.size) }}</small></div><button type="button" class="material-remove" :aria-label="`Remove ${file.name}`" @click="removePendingPetaOutput(index)">×</button></div></div>
            <p v-if="activityForm.petaOutputError" class="material-error">{{ activityForm.petaOutputError }}</p>
          </section>
          <section class="material-upload">
            <div><strong>Learning materials</strong><small>Upload images or HTML files for students. Images are automatically optimized to WebP.</small></div>
            <label class="material-picker"><input type="file" accept="image/*,.html,.htm,text/html" multiple @change="handleMaterialFiles" /><span aria-hidden="true">＋</span>Choose files</label>
            <div v-if="activityForm.existingMaterials.length || activityForm.materialFiles.length" class="material-file-list"><div v-for="material in activityForm.existingMaterials" :key="material.id" class="material-file"><span class="material-file-icon">{{ materialKind(material) === 'HTML' ? '⌘' : '▧' }}</span><div><strong>{{ material.fileName }}</strong><small>{{ materialKind(material) }} · {{ formatFileSize(material.size) }}</small></div><span class="material-saved">Saved</span></div><div v-for="(file, index) in activityForm.materialFiles" :key="`${file.name}-${file.lastModified}`" class="material-file"><span class="material-file-icon">{{ /\.html?$/i.test(file.name) ? '⌘' : '▧' }}</span><div><strong>{{ file.name }}</strong><small>{{ /\.html?$/i.test(file.name) ? 'HTML' : 'Image' }} · {{ formatFileSize(file.size) }}</small></div><button type="button" class="material-remove" :aria-label="`Remove ${file.name}`" @click="removePendingMaterial(index)">×</button></div></div>
            <p v-if="activityForm.materialFileError" class="material-error">{{ activityForm.materialFileError }}</p>
          </section>
        </section>
      </div>
      <div class="modal-actions activity-modal-actions"><button type="button" class="secondary" :disabled="convertingImages" @click="closeModal">Cancel</button><button class="primary" :disabled="busy || convertingImages">{{ convertingImages ? 'Optimizing images…' : busy ? 'Uploading…' : editingActivityId ? 'Save changes' : 'Create activity' }}</button></div>
    </form>
    <form v-else-if="modal === 'announcement'" class="modal-card" @submit.prevent="submitAnnouncement"><div class="modal-title"><div><p class="eyebrow">ANNOUNCEMENT</p><h2>Share an update</h2></div><button type="button" class="icon-button" @click="closeModal">×</button></div><label>Title<input v-model="announcementForm.title" required /></label><label>Message<textarea v-model="announcementForm.message" required placeholder="What do students need to know?"></textarea></label><div class="form-grid"><label>Type<select v-model="announcementForm.announcementType"><option value="General">General</option><option value="Academic">Academic</option><option value="Events">Events</option></select></label><label>Audience<select v-model="announcementForm.targetRole"><option value="students">Students</option><option value="all">Everyone</option><option value="teachers">Teachers</option></select></label></div><label>Class <small>(optional)</small><select v-model="announcementForm.classId"><option value="">All classes</option><option v-for="item in classes" :key="item.id" :value="item.id">{{ item.className }} · {{ item.section }}</option></select></label><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">Publish announcement</button></div></form>
    <form v-else-if="modal === 'scores' && selectedActivity" class="modal-card wide score-modal" @submit.prevent="submitScores"><div class="modal-title"><div><p class="eyebrow">SCORE ENCODING & RESULTS</p><h2>{{ selectedActivity.title }}</h2><p>{{ selectedActivity.totalPoints }} points possible · <strong>{{ Object.values(submissions).filter(s => s.status === 'submitted' || s.status === 'late').length }} of {{ students.length }}</strong> students completed</p></div><button type="button" class="icon-button" @click="closeModal">×</button></div><div class="score-list"><div v-for="student in students" :key="student.id" class="score-row"><div><strong>{{ student.fullName }}</strong><small>{{ student.studentNumber }}</small></div><select v-model="submissions[student.id].status"><option value="submitted">Submitted</option><option value="late">Late</option><option value="missing">Missing</option><option value="excused">Excused</option></select><input v-model.number="submissions[student.id].score" type="number" min="0" :max="selectedActivity.totalPoints" placeholder="Score" /><input v-model="submissions[student.id].remarks" placeholder="Remarks" /></div></div><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="primary" :disabled="busy">Save scores</button></div></form>

    <form v-else-if="modal === 'reset'" class="modal-card reset-modal" @submit.prevent="resetData"><div class="modal-title"><div><p class="eyebrow">PERMANENT ACTION</p><h2>Reset your teaching data</h2></div><button type="button" class="icon-button" @click="closeModal">×</button></div><p>This will permanently delete your attendance, activities, activity submissions, and announcements across every class you manage. Classes and student rosters are not affected.</p><label>Type <strong>RESET</strong> to continue<input v-model="resetConfirmation" autocomplete="off" placeholder="RESET" /></label><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Cancel</button><button class="danger-button" :disabled="resetConfirmation !== 'RESET' || busy">{{ busy ? 'Resetting…' : 'Permanently reset data' }}</button></div></form>
    
    <div v-else-if="modal === 'answer-key' && selectedAnswerKey" class="modal-card wide">
      <div class="modal-title">
        <div><p class="eyebrow">ANSWER KEY</p><h2>{{ selectedAnswerKey.title }}</h2></div>
        <button type="button" class="icon-button" @click="closeModal">×</button>
      </div>
      <div class="quiz-container" style="max-height: 60vh; overflow-y: auto; padding-right: 12px; margin-bottom: 20px;">
        <div v-if="extractQuestions(selectedAnswerKey.quizData).length === 0" style="padding: 24px; background: #fff5f5; color: #b91c1c; border-radius: 8px;">
          <strong>Could not load questions.</strong>
          <p>The uploaded JSON format might not be supported.</p>
        </div>
        <div v-else v-for="(q, i) in extractQuestions(selectedAnswerKey.quizData)" :key="i" class="quiz-question-card" style="padding: 20px;">
          <h3 style="font-size: 16px; margin-bottom: 12px;">{{ Number(i) + 1 }}. {{ q.question || q.text || 'Unknown question format' }}</h3>
          <div class="quiz-options">
             <div v-for="(opt, oIndex) in (q.options || q.choices || [])" :key="oIndex" 
                  :class="['quiz-option', {'selected': String(q.answer ?? q.correctAnswer ?? q.correct) === String(oIndex) || String(q.answer ?? q.correctAnswer ?? q.correct).toLowerCase() === String(opt).toLowerCase()}]"
                  style="cursor: default; padding: 10px 16px;">
               <span v-if="String(q.answer ?? q.correctAnswer ?? q.correct) === String(oIndex) || String(q.answer ?? q.correctAnswer ?? q.correct).toLowerCase() === String(opt).toLowerCase()" style="font-weight: 800; font-size: 18px;">✓ </span>
               <span v-else style="color: #cbd5e1; font-weight: 800; font-size: 18px;">○ </span>
               <span>{{ opt }}</span>
             </div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="primary" @click="closeModal">Close</button>
      </div>
    </div>
    <form v-else-if="modal === 'confirm-next-question'" class="modal-card quiz-lock-modal" @submit.prevent="confirmQuizAdvance"><div class="modal-title"><div><p class="eyebrow">LOCK ANSWER</p><h2>Continue to question {{ currentQuizQuestionIndex + 2 }}?</h2></div><button type="button" class="icon-button" aria-label="Close answer confirmation" @click="closeModal">×</button></div><p>Once you continue, you cannot return to question {{ currentQuizQuestionIndex + 1 }} or change this answer.</p><div class="quiz-locked-answer"><span>Your selected answer</span><strong>{{ currentQuizAnswerLabel }}</strong></div><div class="modal-actions"><button type="button" class="secondary" @click="closeModal">Review answer</button><button class="primary">Lock answer &amp; continue</button></div></form>
    <form v-else-if="modal === 'submit-quiz'" class="modal-card" @submit.prevent="finishQuiz"><div class="modal-title"><div><p class="eyebrow">SUBMIT QUIZ</p><h2>Confirm submission</h2></div><button type="button" class="icon-button" aria-label="Close submission confirmation" :disabled="busy" @click="closeModal">×</button></div><p>You have answered all {{ quizQuestions.length }} questions. Submit your quiz now? You cannot change your answers after submission.</p><div class="modal-actions"><button type="button" class="secondary" :disabled="busy" @click="closeModal">Review final answer</button><button class="primary" :disabled="busy">{{ busy ? 'Submitting…' : 'Submit quiz' }}</button></div></form>
    <form v-else-if="modal === 'exit-quiz'" class="modal-card quiz-exit-modal" @submit.prevent="confirmQuizExit"><div class="modal-title"><div><p class="eyebrow">FINAL SUBMISSION</p><h2>Submit your answers and exit?</h2></div><button type="button" class="icon-button" aria-label="Close exit confirmation" :disabled="busy" @click="closeModal">×</button></div><div class="quiz-exit-warning"><span aria-hidden="true">!</span><p>This permanently ends your test. You will not be able to take it again.</p></div><p>Your score will be based only on the correct answers you have selected. Every unanswered question will be counted as incorrect.</p><div class="quiz-exit-summary" aria-label="Current answer summary"><div><strong>{{ answeredQuizQuestionCount }}</strong><span>Answered</span></div><div><strong>{{ unansweredQuizQuestionCount }}</strong><span>Unanswered</span></div><div><strong>{{ quizQuestions.length }}</strong><span>Total questions</span></div></div><p v-if="exitQuizError" class="quiz-exit-error" role="alert">{{ exitQuizError }}</p><div class="modal-actions"><button type="button" class="secondary" :disabled="busy" @click="closeModal">Continue test</button><button class="danger-button" :disabled="busy">{{ busy ? 'Submitting…' : 'Submit answers & exit' }}</button></div></form>
    <form v-else-if="modal === 'remove-material' && pendingMaterialRemoval" class="modal-card remove-material-modal" @submit.prevent="confirmAttachedFileRemoval">
      <button type="button" class="logout-modal-close" aria-label="Close remove file dialog" :disabled="busy" @click="closeModal">×</button>
      <div class="remove-material-icon" aria-hidden="true">⌫</div>
      <div class="remove-material-copy">
        <p class="eyebrow">REMOVE ATTACHMENT</p>
        <h2>Remove this file?</h2>
        <p>Students will no longer be able to download this {{ pendingMaterialRemoval.kind === 'peta-output' ? 'PETA output image' : 'learning resource' }}.</p>
        <div class="remove-material-file"><span aria-hidden="true">{{ pendingMaterialRemoval.kind === 'peta-output' ? '▧' : materialKind(pendingMaterialRemoval.material) === 'HTML' ? '⌘' : '▤' }}</span><div><strong>{{ pendingMaterialRemoval.material.fileName }}</strong><small>{{ pendingMaterialRemoval.kind === 'peta-output' ? 'PETA output' : 'Learning resource' }} · {{ formatFileSize(pendingMaterialRemoval.material.size) }}</small></div></div>
      </div>
      <div class="logout-modal-actions"><button type="button" class="secondary" :disabled="busy" @click="closeModal">Keep file</button><button class="remove-material-confirm" :disabled="busy"><span aria-hidden="true">⌫</span>{{ busy ? 'Removing…' : 'Remove file' }}</button></div>
    </form>
    <form v-else-if="modal === 'logout'" class="modal-card logout-modal" @submit.prevent="logout"><button type="button" class="logout-modal-close" aria-label="Close sign out dialog" @click="closeModal">×</button><div class="logout-modal-icon" aria-hidden="true">↪</div><div class="logout-modal-copy"><p class="eyebrow">ACCOUNT SESSION</p><h2>Ready to sign out?</h2><p>You’re signed in as <strong>{{ profile?.fullName || 'User' }}</strong>. You’ll need to enter your credentials again to return.</p></div><div class="logout-modal-actions"><button type="button" class="secondary" @click="closeModal">Stay signed in</button><button class="logout-confirm" :disabled="busy"><span aria-hidden="true">↪</span>{{ busy ? 'Signing out…' : 'Yes, sign out' }}</button></div></form>
  </div>
</template>
