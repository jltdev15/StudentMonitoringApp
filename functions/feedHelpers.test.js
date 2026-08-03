const test = require('node:test');
const assert = require('node:assert/strict');
const {activityCategoryForFeed, activityIdsForSubmissionChange, COMMENT_LABELS, isScheduledDate, passingSubmissions, publicStudentName, rankedAchievers, studentFeedProfileChange, STUDENT_POST_PRESETS} = require('./feedHelpers');

test('creates a limited public student name', () => {
  assert.equal(publicStudentName('DELA CRUZ, JUAN L.'), 'Juan D.');
  assert.equal(publicStudentName('Juan Taruc'), 'Juan T.');
});

test('matches serialized schedules in Asia/Manila', () => {
  assert.equal(isScheduledDate('Monday 9:00 AM-12:00 PM; Thursday 1:00 PM-5:00 PM', '2026-08-03'), true);
  assert.equal(isScheduledDate('Tuesday 9:00 AM-12:00 PM', '2026-08-03'), false);
  assert.equal(isScheduledDate('Schedule by arrangement', '2026-08-03'), false);
});

test('selects submitted and late passing scores at fifty percent', () => {
  const passers = passingSubmissions([
    {status: 'submitted', score: 50},
    {status: 'late', score: 75},
    {status: 'submitted', score: 49},
    {status: 'missing', score: 90},
  ], 100);
  assert.deepEqual(passers.map(item => item.score), [50, 75]);
  assert.deepEqual(passingSubmissions([{status: 'submitted', score: 1}], 0), []);
});

test('ranks achievement results by score and keeps full student names', () => {
  const results = rankedAchievers([
    {studentId: 'one', score: 75},
    {studentId: 'two', score: 95},
    {studentId: 'three', score: 95},
    {studentId: 'one', score: 80},
  ], new Map([
    ['one', {fullName: 'DELA CRUZ, JUAN L.'}],
    ['two', {fullName: 'SANTOS, MARIA A.'}],
    ['three', {fullName: 'REYES, ALEX B.'}],
  ]));

  assert.deepEqual(results, [
    {name: 'REYES, ALEX B.', score: 95},
    {name: 'SANTOS, MARIA A.', score: 95},
    {name: 'DELA CRUZ, JUAN L.', score: 80},
  ]);
});

test('exposes only the approved positive comments', () => {
  assert.deepEqual(Object.keys(COMMENT_LABELS), ['congratulations', 'great_job', 'well_done', 'keep_it_up', 'proud_of_you']);
});

test('exposes only approved student feed post presets', () => {
  assert.deepEqual(Object.keys(STUDENT_POST_PRESETS), [
    'ready_to_learn',
    'good_luck',
    'proud_of_class',
    'congratulations',
    'grateful',
  ]);
  assert.equal(Object.values(STUDENT_POST_PRESETS).every(message => message.length > 0), true);
});

test('refreshes every activity affected by a submission change', () => {
  assert.deepEqual(activityIdsForSubmissionChange(null, {activityId: 'activity-1'}), ['activity-1']);
  assert.deepEqual(activityIdsForSubmissionChange({activityId: 'activity-1'}, {activityId: 'activity-1'}), ['activity-1']);
  assert.deepEqual(activityIdsForSubmissionChange({activityId: 'activity-1'}, {activityId: 'activity-2'}), ['activity-1', 'activity-2']);
  assert.deepEqual(activityIdsForSubmissionChange({activityId: 'activity-1'}, null), ['activity-1']);
});

test('normalizes activity categories for achievement posts', () => {
  assert.equal(activityCategoryForFeed({activityCategory: 'quiz'}), 'quiz');
  assert.equal(activityCategoryForFeed({activityCategory: 'Coding'}), 'coding');
  assert.equal(activityCategoryForFeed({quizData: {questions: []}}), 'quiz');
  assert.equal(activityCategoryForFeed({title: 'First Summative Examination'}), 'quiz');
  assert.equal(activityCategoryForFeed({title: 'Build a website'}), 'coding');
  assert.equal(activityCategoryForFeed({title: 'Performance task'}), 'peta');
});

test('detects profile photos that must be synchronized to student posts', () => {
  assert.deepEqual(
    studentFeedProfileChange(
      {userId: 'student-1', photoUrl: ''},
      {userId: 'student-1', photoUrl: ' https://example.com/photo.webp '},
    ),
    {userId: 'student-1', photoUrl: 'https://example.com/photo.webp'},
  );
  assert.deepEqual(
    studentFeedProfileChange(null, {userId: 'student-2', photoUrl: ''}),
    {userId: 'student-2', photoUrl: ''},
  );
  assert.equal(
    studentFeedProfileChange(
      {userId: 'student-1', photoUrl: 'https://example.com/photo.webp'},
      {userId: 'student-1', photoUrl: 'https://example.com/photo.webp'},
    ),
    null,
  );
  assert.equal(studentFeedProfileChange({}, {photoUrl: 'photo.webp'}), null);
});
