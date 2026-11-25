export type WeeklyEmailPreference = {
  email: string;
  subscribed: boolean;
  source: string;
  updated_at: string | null;
};
export type WeeklyEmailRecipient = WeeklyEmailPreference & { name: string };

export function normalizeWeeklyEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && !/[\u0000-\u001f\u007f]/.test(email)
    && /^[^\s@,;<>"]+@[a-z0-9.-]+\.[a-z]{2,63}$/.test(email) ? email : null;
}

export function weeklyEmailPreference(value: unknown): WeeklyEmailPreference {
  const row = value as Partial<WeeklyEmailPreference> | null;
  const email = normalizeWeeklyEmail(row?.email);
  if (!email || typeof row?.subscribed !== 'boolean' || typeof row.source !== 'string') {
    throw new Error('Email preferences could not be loaded. Please try again.');
  }
  return { email, subscribed: row.subscribed, source: row.source, updated_at: row.updated_at ?? null };
}

export function weeklyEmailRecipients(value: unknown): WeeklyEmailRecipient[] {
  if (!Array.isArray(value)) throw new Error('The email list could not be loaded. Please try again.');
  return value.map(row => ({ ...weeklyEmailPreference(row), name: typeof row?.name === 'string' ? row.name : '' }));
}

export function weeklyEmailBcc(rows: WeeklyEmailRecipient[]): string {
  return [...new Set(rows.filter(row => row.subscribed).map(row => normalizeWeeklyEmail(row.email)).filter((email): email is string => Boolean(email)))].join(', ');
}

export function weeklyEmailCsv(rows: WeeklyEmailRecipient[]): string {
  // Spreadsheet formulas can start with =, +, -, or @, even inside quoted CSV cells.
  const cell = (value: string) => `"${(/^[=+\-@]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  return 'email\r\n' + weeklyEmailBcc(rows).split(', ').filter(Boolean).map(cell).join('\r\n') + '\r\n';
}
