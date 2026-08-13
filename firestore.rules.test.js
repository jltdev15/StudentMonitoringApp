const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {collection, doc, getDoc, getDocs, query, setDoc, where} = require('firebase/firestore');

let environment;

test.before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-class-track',
    firestore: {rules: fs.readFileSync('firestore.rules', 'utf8')},
  });
});

test.after(async () => {
  await environment.cleanup();
});

test.beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await Promise.all([
      setDoc(doc(database, 'users', 'student-user'), {
        uid: 'student-user', role: 'student', status: 'active', studentId: 'student-record', classIds: ['class-1'],
      }),
      setDoc(doc(database, 'users', 'teacher-user'), {
        uid: 'teacher-user', role: 'teacher', status: 'active', teacherId: 'teacher-user', classIds: [],
      }),
      setDoc(doc(database, 'classes', 'class-1'), {
        teacherId: 'teacher-user', status: 'active', className: 'Grade 11 ICT',
      }),
      setDoc(doc(database, 'activities', 'quiz-1'), {
        classId: 'class-1', status: 'active', activityCategory: 'quiz', quizData: {questions: []}, totalPoints: 25,
      }),
      setDoc(doc(database, 'feedPosts', 'announcement_one'), {
        type: 'announcement', sourceId: 'one', title: 'Update', body: 'Welcome', likeCount: 0, commentCount: 0,
      }),
    ]);
  });
});

test('active students can read sanitized feed posts but cannot write them', async () => {
  const database = environment.authenticatedContext('student-user').firestore();
  await assertSucceeds(getDoc(doc(database, 'feedPosts', 'announcement_one')));
  await assertFails(setDoc(doc(database, 'feedPosts', 'student-post'), {title: 'Unsafe'}));
  await assertFails(setDoc(doc(database, 'feedPosts', 'announcement_one', 'comments', 'student-user'), {
    comment: 'Arbitrary text',
  }));
});

test('only the owning teacher can write an attendance session summary', async () => {
  const teacherDatabase = environment.authenticatedContext('teacher-user').firestore();
  const studentDatabase = environment.authenticatedContext('student-user').firestore();
  const summary = {classId: 'class-1', date: '2026-08-03', presentCount: 12, totalCount: 15};
  await assertSucceeds(setDoc(doc(teacherDatabase, 'attendanceSessions', 'class-1_2026-08-03'), summary));
  await assertFails(setDoc(doc(studentDatabase, 'attendanceSessions', 'class-1_2026-08-03'), summary));
});

test('inactive students cannot read the global feed', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users', 'inactive-student'), {
      uid: 'inactive-student', role: 'student', status: 'inactive', studentId: 'inactive-record', classIds: [],
    });
  });
  const database = environment.authenticatedContext('inactive-student').firestore();
  await assert.rejects(() => getDoc(doc(database, 'feedPosts', 'announcement_one')));
});

test('students can create one active quiz submission but cannot overwrite it', async () => {
  const database = environment.authenticatedContext('student-user').firestore();
  const submissionRef = doc(database, 'activitySubmissions', 'quiz-1_student-record');
  const submission = {
    activityId: 'quiz-1', classId: 'class-1', studentId: 'student-record', status: 'submitted',
    score: 20, answers: {'0': 'A'}, remarks: 'Auto-graded Quiz', submittedAt: new Date(), updatedAt: new Date(), createdAt: new Date(),
  };
  await assertSucceeds(setDoc(submissionRef, submission));
  await assertFails(setDoc(submissionRef, {...submission, score: 25}, {merge: true}));
});

test('students can query only their submissions within enrolled classes', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    await setDoc(doc(database, 'activitySubmissions', 'quiz-1_student-record'), {
      activityId: 'quiz-1', classId: 'class-1', studentId: 'student-record', status: 'submitted', score: 20, remarks: '',
    });
    await setDoc(doc(database, 'activitySubmissions', 'quiz-1_other-student'), {
      activityId: 'quiz-1', classId: 'class-1', studentId: 'other-student', status: 'submitted', score: 20, remarks: '',
    });
  });

  const database = environment.authenticatedContext('student-user').firestore();
  const submissions = query(
    collection(database, 'activitySubmissions'),
    where('studentId', '==', 'student-record'),
    where('classId', '==', 'class-1'),
  );
  const broadSubmissions = query(
    collection(database, 'activitySubmissions'),
    where('studentId', '==', 'student-record'),
  );

  await assertSucceeds(getDocs(submissions));
  await assertFails(getDocs(broadSubmissions));
  await assertFails(getDoc(doc(database, 'activitySubmissions', 'quiz-1_other-student')));
});

test('students can transition their missing quiz placeholder to submitted exactly once', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'activitySubmissions', 'quiz-1_student-record'), {
      activityId: 'quiz-1', classId: 'class-1', studentId: 'student-record', status: 'missing',
      score: null, remarks: '', createdAt: new Date(), updatedAt: new Date(),
    });
  });
  const database = environment.authenticatedContext('student-user').firestore();
  const submissionRef = doc(database, 'activitySubmissions', 'quiz-1_student-record');
  await assertSucceeds(setDoc(submissionRef, {
    status: 'submitted', score: 18, answers: {'0': 'B'}, remarks: 'Auto-graded Quiz', submittedAt: new Date(), updatedAt: new Date(),
  }, {merge: true}));
  await assertFails(setDoc(submissionRef, {score: 25, updatedAt: new Date()}, {merge: true}));
});

test('excused quiz placeholders remain locked for students', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'activitySubmissions', 'quiz-1_student-record'), {
      activityId: 'quiz-1', classId: 'class-1', studentId: 'student-record', status: 'excused',
      score: null, remarks: 'Excused', createdAt: new Date(), updatedAt: new Date(),
    });
  });
  const database = environment.authenticatedContext('student-user').firestore();
  await assertFails(setDoc(doc(database, 'activitySubmissions', 'quiz-1_student-record'), {
    status: 'submitted', score: 18, answers: {'0': 'B'}, remarks: 'Auto-graded Quiz', submittedAt: new Date(), updatedAt: new Date(),
  }, {merge: true}));
});
