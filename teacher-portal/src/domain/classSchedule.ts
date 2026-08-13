export type ScheduleEntry = {
  day: string;
  startTime: string;
  endTime: string;
};

export const classScheduleDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const formatTimeSlot = (totalMinutes: number) => {
  const hour24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const classScheduleTimeSlots = Array.from(
  {length: (21 - 6) * 2 + 1},
  (_, index) => formatTimeSlot(6 * 60 + index * 30),
);

export const emptyScheduleEntry = (): ScheduleEntry => ({
  day: '',
  startTime: '',
  endTime: '',
});

export const serializeScheduleEntries = (entries: ScheduleEntry[]) =>
  entries
    .map(entry => {
      const day = entry.day.trim();
      const startTime = entry.startTime.trim();
      const endTime = entry.endTime.trim();
      if (!day && !startTime && !endTime) return '';
      const timeRange = startTime && endTime
        ? `${startTime}-${endTime}`
        : startTime || endTime;
      return [day, timeRange].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join('; ');

export const parseScheduleEntries = (schedule?: string | null): ScheduleEntry[] => {
  if (!schedule?.trim()) return [emptyScheduleEntry()];

  const entries = schedule
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const match = part.match(/^(.+?)\s+(.+?)-(.+)$/);
      if (!match) return {day: part, startTime: '', endTime: ''};
      return {day: match[1].trim(), startTime: match[2].trim(), endTime: match[3].trim()};
    });

  return entries.length ? entries : [emptyScheduleEntry()];
};

