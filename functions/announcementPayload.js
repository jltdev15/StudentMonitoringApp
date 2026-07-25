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
    announcementType: announcement.announcementType || 'General',
    featured: String(announcement.featured === true),
    type: 'announcement',
  },
  notification: {
    body: announcement.message.slice(0, 200),
    title: announcement.title,
  },
  topic: announcementTopic(announcement),
});

module.exports = {announcementMessage, announcementTopic};
