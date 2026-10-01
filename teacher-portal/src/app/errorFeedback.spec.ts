import {describe, expect, it} from 'vitest';
import {pageValidationMessage} from './errorFeedback';

describe('pageValidationMessage', () => {
  it('preserves actionable page validation instead of replacing it with a generic error', () => {
    expect(pageValidationMessage('  Select an attendance status for all students.  '))
      .toBe('Select an attendance status for all students.');
  });

  it('leaves non-string failures for the service error formatter', () => {
    expect(pageValidationMessage(new Error('permission denied'))).toBeNull();
    expect(pageValidationMessage('   ')).toBeNull();
  });
});
