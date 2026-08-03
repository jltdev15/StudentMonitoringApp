const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {getMessaging} = require('firebase-admin/messaging');
const {initializeApp} = require('firebase-admin/app');
const {announcementMessage} = require('./announcementPayload');

initializeApp();
const feed = require('./feed');

exports.sendAnnouncementNotification = onDocumentCreated(
  'announcements/{announcementId}',
  async event => {
    const announcement = event.data?.data();
    if (
      !announcement ||
      !['all', 'students'].includes(announcement.targetRole)
    ) {
      return;
    }

    await getMessaging().send(
      announcementMessage(announcement, event.params.announcementId),
    );
  },
);

exports.syncFeedAnnouncement = feed.syncFeedAnnouncement;
exports.syncFeedAttendanceSession = feed.syncFeedAttendanceSession;
exports.syncFeedActivityAchievement = feed.syncFeedActivityAchievement;
exports.syncFeedActivitySubmission = feed.syncFeedActivitySubmission;
exports.syncFeedStudentProfile = feed.syncFeedStudentProfile;
exports.setFeedLike = feed.setFeedLike;
exports.setFeedComment = feed.setFeedComment;
exports.createStudentFeedPost = feed.createStudentFeedPost;
exports.updateStudentFeedPost = feed.updateStudentFeedPost;
exports.deleteStudentFeedPost = feed.deleteStudentFeedPost;
exports.backfillStudentFeed = feed.backfillStudentFeed;
