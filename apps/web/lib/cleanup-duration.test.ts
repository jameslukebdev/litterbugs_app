import { expect, it } from 'vitest';
import { parseCleanupHours } from './cleanup-duration';

it.each([['1.5', 90], ['.5', 30], ['0.08', 5], ['24', 1440], [' 2 ', 120]])('converts %s hours to %s whole minutes', (hours, minutes) => {
  expect(parseCleanupHours(hours)).toEqual({ value: minutes });
});
it('keeps time optional', () => expect(parseCleanupHours('  ')).toEqual({ value: undefined }));
it.each(['0', '-1', '25', '1e2', 'abc', '1.234', 'Infinity'])('rejects invalid time %s', value => {
  expect(parseCleanupHours(value).error).toBeTruthy();
});
