const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {getMessaging} = require('firebase-admin/messaging');
const {initializeApp} = require('firebase-admin/app');
const {announcementMessage} = require('./announcementPayload');

initializeApp();

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
