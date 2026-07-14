const announcementTopic = announcement =>
  announcement.classId ? `class-${announcement.classId}` : 'students-all';

const announcementMessage = (announcement, announcementId) => ({
  android: {
    notification: {
      channelId: 'announcements',
    },
  },
  data: {
    announcementId,
    classId: announcement.classId || '',
    type: 'announcement',
  },
  notification: {
    body: announcement.message.slice(0, 200),
    title: announcement.title,
  },
  topic: announcementTopic(announcement),
});

module.exports = {announcementMessage, announcementTopic};
