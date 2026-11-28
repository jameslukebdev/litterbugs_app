/** Match the app: enter decimal hours, save whole minutes. Empty time is optional. */
export function parseCleanupHours(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { value: undefined as number | undefined };
  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(trimmed)) {
    return { error: 'Time spent must be a number of hours, like 1.5.' };
  }
  const minutes = Math.round(Number(trimmed) * 60);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
    return { error: 'Time spent must be between 1 minute and 24 hours.' };
  }
  return { value: minutes };
}
