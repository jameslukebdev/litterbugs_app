import { expect, it } from 'vitest';
import { normalizeWeeklyEmail, weeklyEmailBcc, weeklyEmailCsv, weeklyEmailPreference, type WeeklyEmailRecipient } from './weekly-email';
const row = (email: string, subscribed = true): WeeklyEmailRecipient => ({ email, subscribed, name: 'Member', source: 'signup_default', updated_at: null });
it('normalizes addresses and rejects recipient injection and control characters', () => {
  expect(normalizeWeeklyEmail(' ALEX@Example.com ')).toBe('alex@example.com');
  for (const value of ['a@example.com, b@example.com', 'a@example.com\r\nBcc:b@example.com', 'Alex <a@example.com>', 'a@invalid', null, 'x'.repeat(255)+'@example.com']) expect(normalizeWeeklyEmail(value)).toBeNull();
});
it('requires a real boolean preference instead of silently treating failed data as subscribed', () => {
  expect(() => weeklyEmailPreference(null)).toThrow();
  expect(() => weeklyEmailPreference({ email: 'a@example.com', subscribed: 'false', source: 'default' })).toThrow();
  expect(weeklyEmailPreference(row('a@example.com', false)).subscribed).toBe(false);
});
it('exports only subscribed unique safe addresses and escapes spreadsheet formulas', () => {
  const rows = [row('A@example.com'), row('a@example.com'), row('off@example.com', false), row('b@example.com, c@example.com'), row('+test@example.com')];
  expect(weeklyEmailBcc(rows)).toBe('a@example.com, +test@example.com');
  expect(weeklyEmailCsv(rows)).toBe('email\r\n"a@example.com"\r\n"\'+test@example.com"\r\n');
});
