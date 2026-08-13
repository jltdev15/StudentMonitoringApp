const COMMENT_LABELS = Object.freeze({
  congratulations: 'Congratulations! 🎉',
  great_job: 'Great job! 👏',
  well_done: 'Well done! ⭐',
  keep_it_up: 'Keep it up! 💪',
  proud_of_you: 'Proud of you! 🙌',
});

const STUDENT_POST_PRESETS = Object.freeze({
  ready_to_learn: 'Ready to learn and make today count! 📚',
  good_luck: 'Good luck with your activities, everyone! 💪',
  proud_of_class: 'Proud of our class—let’s keep doing our best! 🌟',
  congratulations: 'Congratulations to everyone on your hard work! 🎉',
  grateful: 'Grateful for another day of learning together. 🙌',
});

const titleCaseWord = value => {
  const normalized = String(value || '').trim().toLocaleLowerCase('en');
  return normalized ? normalized[0].toLocaleUpperCase('en') + normalized.slice(1) : '';
};

const publicStudentName = fullName => {
  const normalized = String(fullName || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Student';

  if (normalized.includes(',')) {
    const [surname, givenNames] = normalized.split(',', 2).map(value => value.trim());
    const firstName = givenNames.split(' ')[0];
    return `${titleCaseWord(firstName)} ${surname.charAt(0).toLocaleUpperCase('en')}.`.trim();
  }

  const words = normalized.split(' ');
  if (words.length === 1) return titleCaseWord(words[0]);
  return `${titleCaseWord(words[0])} ${words[words.length - 1].charAt(0).toLocaleUpperCase('en')}.`;
};

const fullStudentName = fullName =>
  String(fullName || '').replace(/\s+/g, ' ').trim();

const rankedAchievers = (submissions, studentsById) => {
  const bestResultByStudent = new Map();
  submissions.forEach(submission => {
    const name = fullStudentName(studentsById.get(submission.studentId)?.fullName);
    const score = Number(submission.score);
    if (!name || !Number.isFinite(score)) return;
    const current = bestResultByStudent.get(submission.studentId);
    if (!current || score > current.score) {
      bestResultByStudent.set(submission.studentId, {name, score});
    }
  });
  return [...bestResultByStudent.values()].sort((first, second) =>
    second.score - first.score || first.name.localeCompare(second.name),
  );
};

const weekdayForManilaDate = date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
  }).format(new Date(`${date}T12:00:00+08:00`));
};

const isScheduledDate = (schedule, date) => {
  const weekday = weekdayForManilaDate(date);
  if (!weekday || !String(schedule || '').trim()) return false;
  return String(schedule)
    .split(';')
    .map(value => value.trim().toLocaleLowerCase('en'))
    .some(value => value === weekday.toLocaleLowerCase('en') || value.startsWith(`${weekday.toLocaleLowerCase('en')} `));
};

const passingSubmissions = (submissions, totalPoints) => {
  const maximum = Number(totalPoints);
  if (!Number.isFinite(maximum) || maximum <= 0) return [];
  const threshold = maximum * 0.5;
  return submissions.filter(item =>
    ['submitted', 'late'].includes(item.status)
    && typeof item.score === 'number'
    && Number.isFinite(item.score)
    && item.score >= threshold,
  );
};

const activityIdsForSubmissionChange = (before, after) =>
  [...new Set([before?.activityId, after?.activityId].filter(Boolean))];

const activityCategoryForFeed = activity => {
  const category = String(activity?.activityCategory || '').trim().toLocaleLowerCase('en');
  if (['peta', 'quiz', 'coding', 'lecture'].includes(category)) return category;
  if (activity?.quizData) return 'quiz';
  const searchable = `${activity?.title || ''} ${activity?.description || ''}`;
  if (/coding|programming|\bcode\b|website/i.test(searchable)) return 'coding';
  if (/quiz|test|exam|summative/i.test(searchable)) return 'quiz';
  return 'peta';
};

const studentFeedProfileChange = (before, after) => {
  const previousUserId = String(before?.userId || '').trim();
  const userId = String(after?.userId || '').trim();
  const previousPhotoUrl = String(before?.photoUrl || '').trim();
  const photoUrl = String(after?.photoUrl || '').trim();
  if (!userId || (previousUserId === userId && previousPhotoUrl === photoUrl)) return null;
  return {userId, photoUrl};
};

const validateTeacherPost = message => {
  const normalizedMessage = String(message || '').trim();
  if (!normalizedMessage) return {error: 'Enter a message.'};
  if (normalizedMessage.length > 1000) return {error: 'Messages must be 1,000 characters or fewer.'};
  return {title: '', message: normalizedMessage, error: ''};
};

module.exports = {
  activityCategoryForFeed,
  activityIdsForSubmissionChange,
  COMMENT_LABELS,
  fullStudentName,
  isScheduledDate,
  passingSubmissions,
  publicStudentName,
  rankedAchievers,
  studentFeedProfileChange,
  STUDENT_POST_PRESETS,
  validateTeacherPost,
  weekdayForManilaDate,
};
