const {
  announcementMessage,
  announcementTopic,
} = require('../functions/announcementPayload');

it('targets a class announcement only to that class topic', () => {
  expect(announcementTopic({classId: 'class-1'})).toBe('class-class-1');
});

it('targets a general announcement to all students', () => {
  const message = announcementMessage(
    {
      classId: null,
      message: 'School will close early today.',
      title: 'Important update',
    },
    'announcement-1',
  );

  expect(message.topic).toBe('students-all');
  expect(message.data).toEqual({
    announcementId: 'announcement-1',
    classId: '',
    type: 'announcement',
  });
});
