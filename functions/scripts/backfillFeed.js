const {getApps, initializeApp} = require('firebase-admin/app');
const {Timestamp, getFirestore} = require('firebase-admin/firestore');

const projectArgument = process.argv.find(value => value.startsWith('--project='));
const projectId = projectArgument?.split('=', 2)[1]
  || process.env.GOOGLE_CLOUD_PROJECT
  || process.env.GCLOUD_PROJECT
  || 'student-mngt-6ca8e';

if (!getApps().length) initializeApp({projectId});

const {syncAchievementPost, syncAnnouncementPost, syncAttendanceSessionPost} = require('../feed');
const {isScheduledDate, passingSubmissions} = require('../feedHelpers');
const db = getFirestore();
const apply = process.argv.includes('--apply');
const DAYS = 30;

const cutoff = new Date();
cutoff.setUTCDate(cutoff.getUTCDate() - DAYS);
const cutoffTimestamp = Timestamp.fromDate(cutoff);
const cutoffDate = cutoff.toLocaleDateString('en-CA', {timeZone: 'Asia/Manila'});

const asMillis = value => value?.toMillis?.() || value?.getTime?.() || 0;

async function backfillAnnouncements() {
  const snapshot = await db.collection('announcements').where('classId', '==', null).get();
  const eligible = snapshot.docs.filter(item => {
    const value = item.data();
    return ['all', 'students'].includes(value.targetRole) && asMillis(value.createdAt) >= cutoffTimestamp.toMillis();
  });
  if (apply) await Promise.all(eligible.map(item => syncAnnouncementPost(item.id, item.data())));
  return eligible.length;
}

async function backfillAttendance() {
  const snapshot = await db.collection('attendance').where('date', '>=', cutoffDate).get();
  const groups = new Map();
  snapshot.docs.forEach(item => {
    const value = item.data();
    const id = `${value.classId}_${value.date}`;
    const group = groups.get(id) || {classId: value.classId, date: value.date, recordedBy: value.recordedBy || '', records: []};
    group.records.push(value);
    groups.set(id, group);
  });

  let eligible = 0;
  for (const [id, group] of groups) {
    const classSnapshot = await db.collection('classes').doc(group.classId).get();
    if (!classSnapshot.exists || !isScheduledDate(classSnapshot.data().schedule, group.date)) continue;
    eligible += 1;
    if (!apply) continue;
    const statusCounts = group.records.reduce((counts, item) => {
      if (item.status) counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});
    const now = Timestamp.now();
    const session = {
      classId: group.classId,
      date: group.date,
      recordedBy: group.recordedBy,
      presentCount: statusCounts.present || 0,
      totalCount: group.records.length,
      statusCounts,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection('attendanceSessions').doc(id).set(session, {merge: true});
    await syncAttendanceSessionPost(id, session);
  }
  return eligible;
}

async function backfillAchievements() {
  const snapshot = await db.collection('activities').where('status', '==', 'closed').get();
  let eligible = 0;
  for (const item of snapshot.docs) {
    const activity = item.data();
    const publishedTime = asMillis(activity.closedAt || activity.updatedAt);
    if (publishedTime < cutoffTimestamp.toMillis()) continue;
    const submissions = await db.collection('activitySubmissions').where('activityId', '==', item.id).get();
    if (!passingSubmissions(submissions.docs.map(value => value.data()), activity.totalPoints).length) continue;
    eligible += 1;
    if (apply) await syncAchievementPost(item.id, activity);
  }
  return eligible;
}

async function backfillStudentProfilePhotos() {
  const posts = await db.collection('feedPosts').where('type', '==', 'student').get();
  const profilePhotos = new Map();
  let stale = 0;
  for (const post of posts.docs) {
    const value = post.data();
    const userId = String(value.authorId || '').trim();
    if (!userId) continue;
    if (!profilePhotos.has(userId)) {
      const profile = await db.collection('students').where('userId', '==', userId).limit(1).get();
      profilePhotos.set(userId, profile.empty ? '' : String(profile.docs[0].data().photoUrl || '').trim());
    }
    const photoUrl = profilePhotos.get(userId);
    if (String(value.authorPhotoUrl || '').trim() === photoUrl) continue;
    stale += 1;
    if (apply) await post.ref.update({authorPhotoUrl: photoUrl, updatedAt: Timestamp.now()});
  }
  return stale;
}

async function main() {
  const [announcements, attendance, achievements, studentProfiles] = await Promise.all([
    backfillAnnouncements(),
    backfillAttendance(),
    backfillAchievements(),
    backfillStudentProfilePhotos(),
  ]);
  const mode = apply ? 'Applied' : 'Dry run';
  console.log(`${mode}: ${announcements} announcements, ${attendance} attendance sessions, ${achievements} activity-achievement posts, ${studentProfiles} student-post profile photos.`);
  if (!apply) console.log('Run again with --apply after deploying the feed functions and Firestore rules.');
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  if (/credential|authentication|default credentials|Could not load the default credentials|UNAUTHENTICATED/i.test(message)) {
    console.error(
      `Could not authenticate Firebase Admin for ${projectId}.\n`
      + 'Firebase CLI login is separate from Admin SDK authentication. Run:\n\n'
      + '  gcloud auth application-default login\n'
      + `  gcloud auth application-default set-quota-project ${projectId}\n\n`
      + 'Then run this backfill command again.',
    );
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
