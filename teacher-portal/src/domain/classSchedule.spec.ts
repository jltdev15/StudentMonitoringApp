import {describe, expect, it} from 'vitest';
import {
  classScheduleDays,
  classScheduleTimeSlots,
  emptyScheduleEntry,
  parseScheduleEntries,
  serializeScheduleEntries,
} from './classSchedule';

describe('class schedules', () => {
  it('provides Android-compatible day and time choices', () => {
    expect(classScheduleDays[0]).toBe('Monday');
    expect(classScheduleDays[classScheduleDays.length - 1]).toBe('Sunday');
    expect(classScheduleTimeSlots[0]).toBe('6:00 AM');
    expect(classScheduleTimeSlots[classScheduleTimeSlots.length - 1]).toBe('9:00 PM');
  });

  it('round trips multiple schedule rows in the existing string format', () => {
    const entries = [
      {day: 'Tuesday', startTime: '9:00 AM', endTime: '12:00 PM'},
      {day: 'Thursday', startTime: '1:00 PM', endTime: '5:00 PM'},
    ];
    const serialized = serializeScheduleEntries(entries);
    expect(serialized).toBe('Tuesday 9:00 AM-12:00 PM; Thursday 1:00 PM-5:00 PM');
    expect(parseScheduleEntries(serialized)).toEqual(entries);
  });

  it('keeps malformed legacy text editable instead of discarding it', () => {
    expect(parseScheduleEntries('By arrangement')).toEqual([{day: 'By arrangement', startTime: '', endTime: ''}]);
    expect(parseScheduleEntries('')).toEqual([emptyScheduleEntry()]);
  });
});
