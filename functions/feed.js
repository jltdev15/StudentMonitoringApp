const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const {HttpsError, onCall} = require('firebase-functions/v2/https');
const {FieldValue, Timestamp, getFirestore} = require('firebase-admin/firestore');
const {
  activityCategoryForFeed,
  activityIdsForSubmissionChange,
  COMMENT_LABELS,
  isScheduledDate,
  passingSubmissions,
  publicStudentName,
  rankedAchievers,
  studentFeedProfileChange,
  STUDENT_POST_PRESETS,
  validateTeacherPost,
} = require('./feedHelpers');

const db = getFirestore();
const feedPost = id => db.collection('feedPosts').doc(id);

const sourceTimestamp = (value, fallback = FieldValue.serverTimestamp()) => value || fallback;
const engagementCounts = async target => {
  const current = await target.get();
  return current.exists
    ? {likeCount: Math.max(0, Number(current.data().likeCount) || 0), commentCount: Math.max(0, Number(current.data().commentCount) || 0)}
    : {likeCount: 0, commentCount: 0};
};

async function syncAnnouncementPost(announcementId, announcement) {
  const target = feedPost(`announcement_${announcementId}`);
  const eligible = announcement
    && announcement.classId == null
    && ['all', 'students'].includes(announcement.targetRole);
  if (!eligible) {
    await target.delete().catch(() => {});
    return false;
  }

  const teacher = announcement.postedBy
    ? await db.collection('users').doc(announcement.postedBy).get()
    : null;
  const counts = await engagementCounts(target);
  await target.set({
    type: 'announcement',
    sourceId: announcementId,
    title: announcement.title || 'Announcement',
    body: announcement.message || '',
    authorLabel: teacher?.exists ? teacher.data().fullName || 'Your teacher' : 'Your teacher',
    announcementType: announcement.announcementType || 'General',
    publishedAt: sourceTimestamp(announcement.createdAt),
    updatedAt: FieldValue.serverTimestamp(),
    ...counts,
  }, {merge: true});
  return true;
}

async function syncAttendanceSessionPost(sessionId, session) {
  const target = feedPost(`attendance_${sessionId}`);
  if (!session?.classId || !session?.date) {
    await target.delete().catch(() => {});
    return false;
  }
  const classSnapshot = await db.collection('classes').doc(session.classId).get();
  const classRecord = classSnapshot.exists ? classSnapshot.data() : null;
  if (!classRecord || classRecord.status !== 'active' || !isScheduledDate(classRecord.schedule, session.date)) {
    await target.delete().catch(() => {});
    return false;
  }

  const classLabel = [classRecord.className, classRecord.gradeLevel, classRecord.section]
    .filter(Boolean)
    .join(' · ');
  const presentCount = Math.max(0, Number(session.presentCount) || 0);
  const counts = await engagementCounts(target);
  await target.set({
    type: 'attendance',
    sourceId: sessionId,
    classId: session.classId,
    title: 'Attendance update',
    body: `${presentCount} ${presentCount === 1 ? 'student was' : 'students were'} present for this class session.`,
    classLabel,
    schedule: classRecord.schedule,
    sessionDate: session.date,
    presentCount,
    publishedAt: sourceTimestamp(session.updatedAt || session.createdAt),
    updatedAt: FieldValue.serverTimestamp(),
    ...counts,
  }, {merge: true});
  return true;
}

async function syncAchievementPost(activityId, activity) {
  const target = feedPost(`achievement_${activityId}`);
  if (!activity || activity.status !== 'closed') {
    await target.delete().catch(() => {});
    return false;
  }

  const submissionsSnapshot = await db.collection('activitySubmissions')
    .where('activityId', '==', activityId)
    .get();
  const passers = passingSubmissions(
    submissionsSnapshot.docs.map(item => item.data()),
    activity.totalPoints,
  );
  if (!passers.length) {
    await target.delete().catch(() => {});
    return false;
  }

  const studentRefs = passers.map(item => db.collection('students').doc(item.studentId));
  const students = studentRefs.length ? await db.getAll(...studentRefs) : [];
  const studentsById = new Map(students
    .filter(item => item.exists)
    .map(item => [item.id, item.data()]));
  const achieverResults = rankedAchievers(passers, studentsById);
  if (!achieverResults.length) {
    await target.delete().catch(() => {});
    return false;
  }

  const classSnapshot = activity.classId
    ? await db.collection('classes').doc(activity.classId).get()
    : null;
  const classRecord = classSnapshot?.exists ? classSnapshot.data() : null;
  const counts = await engagementCounts(target);
  await target.set({
    type: 'achievement',
    sourceId: activityId,
    classId: activity.classId || null,
    title: 'Activity Achievers',
    body: `Congratulations to the students who earned a passing score in ${activity.title || 'this activity'}!`,
    activityTitle: activity.title || 'Activity',
    activityCategory: activityCategoryForFeed(activity),
    totalPoints: Number(activity.totalPoints),
    classLabel: classRecord
      ? [classRecord.className, classRecord.gradeLevel, classRecord.section].filter(Boolean).join(' · ')
      : '',
    achieverResults,
    achievers: achieverResults.map(item => item.name),
    achieverCount: achieverResults.length,
    publishedAt: sourceTimestamp(activity.closedAt || activity.updatedAt),
    updatedAt: FieldValue.serverTimestamp(),
    ...counts,
  }, {merge: true});
  return true;
}

async function syncStudentProfilePosts(userId, photoUrl) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return 0;

  const snapshot = await db.collection('feedPosts').where('authorId', '==', normalizedUserId).get();
  const targets = snapshot.docs.filter(item => item.data().type === 'student');
  for (let offset = 0; offset < targets.length; offset += 500) {
    const batch = db.batch();
    targets.slice(offset, offset + 500).forEach(item => batch.update(item.ref, {
      authorPhotoUrl: String(photoUrl || '').trim(),
      updatedAt: FieldValue.serverTimestamp(),
    }));
    await batch.commit();
  }
  return targets.length;
}

const syncFeedAnnouncement = onDocumentWritten('announcements/{announcementId}', async event => {
  const value = event.data?.after?.exists ? event.data.after.data() : null;
  await syncAnnouncementPost(event.params.announcementId, value);
});

const syncFeedAttendanceSession = onDocumentWritten('attendanceSessions/{sessionId}', async event => {
  const value = event.data?.after?.exists ? event.data.after.data() : null;
  await syncAttendanceSessionPost(event.params.sessionId, value);
});

const syncFeedActivityAchievement = onDocumentWritten('activities/{activityId}', async event => {
  const value = event.data?.after?.exists ? event.data.after.data() : null;
  await syncAchievementPost(event.params.activityId, value);
});

const syncFeedActivitySubmission = onDocumentWritten('activitySubmissions/{submissionId}', async event => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  const activityIds = activityIdsForSubmissionChange(before, after);

  for (const activityId of activityIds) {
    const activitySnapshot = await db.collection('activities').doc(activityId).get();
    await syncAchievementPost(activityId, activitySnapshot.exists ? activitySnapshot.data() : null);
  }
});

const syncFeedStudentProfile = onDocumentWritten('students/{studentId}', async event => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  const change = studentFeedProfileChange(before, after);
  if (change) await syncStudentProfilePosts(change.userId, change.photoUrl);
});

async function activeStudent(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to interact with the feed.');
  const userSnapshot = await db.collection('users').doc(request.auth.uid).get();
  const user = userSnapshot.exists ? userSnapshot.data() : null;
  if (!user || user.role !== 'student' || user.status !== 'active') {
    throw new HttpsError('permission-denied', 'Only active students can interact with the feed.');
  }
  const studentSnapshot = user.studentId
    ? await db.collection('students').doc(user.studentId).get()
    : null;
  return {
    uid: request.auth.uid,
    displayName: publicStudentName(studentSnapshot?.exists ? studentSnapshot.data().fullName : user.fullName),
    fullName: String(studentSnapshot?.exists ? studentSnapshot.data().fullName || '' : user.fullName || '').trim(),
    photoUrl: studentSnapshot?.exists ? String(studentSnapshot.data().photoUrl || '').trim() : '',
  };
}

async function activeTeacher(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in as a teacher to manage the feed.');
  const userSnapshot = await db.collection('users').doc(request.auth.uid).get();
  const user = userSnapshot.exists ? userSnapshot.data() : null;
  if (!user || user.role !== 'teacher' || user.status !== 'active') {
    throw new HttpsError('permission-denied', 'Only active teachers can manage the feed.');
  }
  return {uid: request.auth.uid, ...user};
}

async function activeFeedMember(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to interact with the feed.');
  const userSnapshot = await db.collection('users').doc(request.auth.uid).get();
  const user = userSnapshot.exists ? userSnapshot.data() : null;
  if (!user || user.status !== 'active' || !['student', 'teacher'].includes(user.role)) {
    throw new HttpsError('permission-denied', 'Only active students and teachers can interact with the feed.');
  }
  if (user.role === 'teacher') return {uid: request.auth.uid, role: 'teacher', displayName: String(user.fullName || 'Teacher').trim() || 'Teacher'};
  const student = await activeStudent(request);
  return {...student, role: 'student'};
}

const setFeedLike = onCall(async request => {
  const member = await activeFeedMember(request);
  const postId = String(request.data?.postId || '');
  const liked = request.data?.liked === true;
  if (!postId) throw new HttpsError('invalid-argument', 'A feed post is required.');
  const postRef = feedPost(postId);
  const likeRef = postRef.collection('likes').doc(member.uid);

  return db.runTransaction(async transaction => {
    const [postSnapshot, likeSnapshot] = await Promise.all([transaction.get(postRef), transaction.get(likeRef)]);
    if (!postSnapshot.exists) throw new HttpsError('not-found', 'This feed post is no longer available.');
    const wasLiked = likeSnapshot.exists;
    if (liked && !wasLiked) {
      transaction.set(likeRef, {displayName: member.displayName, role: member.role, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()});
      transaction.update(postRef, {likeCount: FieldValue.increment(1)});
    } else if (!liked && wasLiked) {
      transaction.delete(likeRef);
      transaction.update(postRef, {likeCount: FieldValue.increment(-1)});
    }
    return {liked};
  });
});

const setFeedComment = onCall(async request => {
  const member = await activeFeedMember(request);
  const postId = String(request.data?.postId || '');
  const commentKey = request.data?.commentKey == null ? null : String(request.data.commentKey);
  if (!postId) throw new HttpsError('invalid-argument', 'A feed post is required.');
  if (commentKey !== null && !COMMENT_LABELS[commentKey]) {
    throw new HttpsError('invalid-argument', 'Choose one of the approved comments.');
  }
  const postRef = feedPost(postId);
  const commentRef = postRef.collection('comments').doc(member.uid);

  return db.runTransaction(async transaction => {
    const [postSnapshot, commentSnapshot] = await Promise.all([transaction.get(postRef), transaction.get(commentRef)]);
    if (!postSnapshot.exists) throw new HttpsError('not-found', 'This feed post is no longer available.');
    const hadComment = commentSnapshot.exists;
    if (commentKey) {
      transaction.set(commentRef, {
        displayName: member.displayName,
        role: member.role,
        commentKey,
        comment: COMMENT_LABELS[commentKey],
        createdAt: commentSnapshot.data()?.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (!hadComment) transaction.update(postRef, {commentCount: FieldValue.increment(1)});
    } else if (hadComment) {
      transaction.delete(commentRef);
      transaction.update(postRef, {commentCount: FieldValue.increment(-1)});
    }
    return {commentKey};
  });
});

const createStudentFeedPost = onCall(async request => {
  const student = await activeStudent(request);
  const presetKey = String(request.data?.presetKey || '');
  const body = STUDENT_POST_PRESETS[presetKey];
  if (!body) throw new HttpsError('invalid-argument', 'Choose one of the approved messages.');

  const now = Timestamp.now();
  const stateRef = db.collection('feedPostLimits').doc(student.uid);
  const postRef = db.collection('feedPosts').doc();
  await db.runTransaction(async transaction => {
    const stateSnapshot = await transaction.get(stateRef);
    const lastPostedAt = stateSnapshot.data()?.lastPostedAt?.toMillis?.() || 0;
    if (now.toMillis() - lastPostedAt < 5 * 60 * 1000) {
      throw new HttpsError('resource-exhausted', 'Please wait a few minutes before sharing another update.');
    }
    transaction.create(postRef, {
      type: 'student',
      sourceId: postRef.id,
      authorId: student.uid,
      authorLabel: student.fullName || student.displayName,
      authorPhotoUrl: student.photoUrl || '',
      title: 'Student update',
      body,
      presetKey,
      likeCount: 0,
      commentCount: 0,
      publishedAt: now,
      updatedAt: now,
    });
    transaction.set(stateRef, {lastPostedAt: now}, {merge: true});
  });
  return {postId: postRef.id};
});

const ownedStudentPost = async (postId, studentUid) => {
  if (!postId) throw new HttpsError('invalid-argument', 'A feed post is required.');
  const postRef = feedPost(postId);
  const snapshot = await postRef.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'This feed post is no longer available.');
  const post = snapshot.data();
  if (post.type !== 'student' || post.authorId !== studentUid) {
    throw new HttpsError('permission-denied', 'You can only manage your own student posts.');
  }
  return postRef;
};

const updateStudentFeedPost = onCall(async request => {
  const student = await activeStudent(request);
  const postId = String(request.data?.postId || '');
  const presetKey = String(request.data?.presetKey || '');
  const body = STUDENT_POST_PRESETS[presetKey];
  if (!body) throw new HttpsError('invalid-argument', 'Choose one of the approved messages.');
  const postRef = await ownedStudentPost(postId, student.uid);
  await postRef.update({body, presetKey, updatedAt: FieldValue.serverTimestamp()});
  return {postId};
});

const deleteStudentFeedPost = onCall(async request => {
  const student = await activeStudent(request);
  const postId = String(request.data?.postId || '');
  const postRef = await ownedStudentPost(postId, student.uid);
  await db.recursiveDelete(postRef);
  return {postId};
});

const teacherPostInput = request => {
  const value = validateTeacherPost(request.data?.message);
  if (value.error) throw new HttpsError('invalid-argument', value.error);
  return value;
};

const createTeacherFeedPost = onCall(async request => {
  const teacher = await activeTeacher(request);
  const input = teacherPostInput(request);
  const postRef = db.collection('feedPosts').doc();
  const now = Timestamp.now();
  await postRef.create({type: 'teacher', sourceId: postRef.id, authorId: teacher.uid, authorLabel: String(teacher.fullName || 'Teacher').trim() || 'Teacher', title: '', body: input.message, likeCount: 0, commentCount: 0, publishedAt: now, updatedAt: now});
  return {postId: postRef.id};
});

const ownedTeacherPost = async (postId, teacherUid) => {
  if (!postId) throw new HttpsError('invalid-argument', 'A feed post is required.');
  const postRef = feedPost(postId);
  const snapshot = await postRef.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'This feed post is no longer available.');
  if (snapshot.data().type !== 'teacher' || snapshot.data().authorId !== teacherUid) throw new HttpsError('permission-denied', 'You can only manage your own teacher posts.');
  return postRef;
};

const updateTeacherFeedPost = onCall(async request => {
  const teacher = await activeTeacher(request);
  const input = teacherPostInput(request);
  const postId = String(request.data?.postId || '');
  const postRef = await ownedTeacherPost(postId, teacher.uid);
  await postRef.update({title: '', body: input.message, updatedAt: FieldValue.serverTimestamp()});
  return {postId};
});

const deleteTeacherFeedPost = onCall(async request => {
  const teacher = await activeTeacher(request);
  const postId = String(request.data?.postId || '');
  const postRef = await ownedTeacherPost(postId, teacher.uid);
  await db.recursiveDelete(postRef);
  return {postId};
});

const moderateStudentFeedPost = onCall(async request => {
  await activeTeacher(request);
  const postId = String(request.data?.postId || '');
  if (!postId) throw new HttpsError('invalid-argument', 'A feed post is required.');
  const postRef = feedPost(postId);
  const snapshot = await postRef.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'This feed post is no longer available.');
  if (snapshot.data().type !== 'student') throw new HttpsError('permission-denied', 'Teachers may moderate student posts only.');
  await db.recursiveDelete(postRef);
  return {postId};
});

const backfillStudentFeed = onCall({timeoutSeconds: 540, memory: '512MiB'}, async request => {
  await activeTeacher(request);
  const cutoffDateValue = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDateValue);
  const cutoffDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(cutoffDateValue);

  const announcementSnapshot = await db.collection('announcements').where('classId', '==', null).get();
  let announcements = 0;
  for (const item of announcementSnapshot.docs) {
    const value = item.data();
    const createdAt = value.createdAt?.toMillis?.() || 0;
    if (createdAt >= cutoffTimestamp.toMillis() && await syncAnnouncementPost(item.id, value)) announcements += 1;
  }

  const attendanceSnapshot = await db.collection('attendance').where('date', '>=', cutoffDate).get();
  const sessions = new Map();
  attendanceSnapshot.docs.forEach(item => {
    const value = item.data();
    const sessionId = `${value.classId}_${value.date}`;
    const session = sessions.get(sessionId) || {classId: value.classId, date: value.date, recordedBy: value.recordedBy || '', records: []};
    session.records.push(value);
    sessions.set(sessionId, session);
  });
  let attendance = 0;
  for (const [sessionId, session] of sessions) {
    const statusCounts = session.records.reduce((counts, item) => {
      if (item.status) counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});
    const now = Timestamp.now();
    const summary = {
      classId: session.classId,
      date: session.date,
      recordedBy: session.recordedBy,
      presentCount: statusCounts.present || 0,
      totalCount: session.records.length,
      statusCounts,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection('attendanceSessions').doc(sessionId).set(summary, {merge: true});
    if (await syncAttendanceSessionPost(sessionId, summary)) attendance += 1;
  }

  const activitySnapshot = await db.collection('activities').where('status', '==', 'closed').get();
  let achievements = 0;
  for (const item of activitySnapshot.docs) {
    const activity = item.data();
    const closedAt = (activity.closedAt || activity.updatedAt)?.toMillis?.() || 0;
    if (closedAt >= cutoffTimestamp.toMillis() && await syncAchievementPost(item.id, activity)) achievements += 1;
  }

  const studentPostSnapshot = await db.collection('feedPosts').where('type', '==', 'student').get();
  const studentProfiles = new Map();
  let studentProfilesUpdated = 0;
  for (const post of studentPostSnapshot.docs) {
    const userId = String(post.data().authorId || '').trim();
    if (!userId) continue;
    if (!studentProfiles.has(userId)) {
      const profileSnapshot = await db.collection('students').where('userId', '==', userId).limit(1).get();
      studentProfiles.set(userId, profileSnapshot.empty ? '' : String(profileSnapshot.docs[0].data().photoUrl || '').trim());
    }
    const photoUrl = studentProfiles.get(userId);
    if (String(post.data().authorPhotoUrl || '').trim() === photoUrl) continue;
    await post.ref.update({authorPhotoUrl: photoUrl, updatedAt: FieldValue.serverTimestamp()});
    studentProfilesUpdated += 1;
  }

  return {announcements, attendance, achievements, studentProfilesUpdated, days: 30};
});

module.exports = {
  backfillStudentFeed,
  createStudentFeedPost,
  createTeacherFeedPost,
  deleteStudentFeedPost,
  deleteTeacherFeedPost,
  moderateStudentFeedPost,
  setFeedComment,
  setFeedLike,
  updateStudentFeedPost,
  updateTeacherFeedPost,
  syncAchievementPost,
  syncAnnouncementPost,
  syncAttendanceSessionPost,
  syncStudentProfilePosts,
  syncFeedActivityAchievement,
  syncFeedActivitySubmission,
  syncFeedAnnouncement,
  syncFeedAttendanceSession,
  syncFeedStudentProfile,
};
