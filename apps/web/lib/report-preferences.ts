export type ReportPreferences = {
  favorites: string[];
  hidden: string[];
};

const STORAGE_PREFIX = 'litterbugs.report-preferences.v1';
const EMPTY_PREFERENCES: ReportPreferences = { favorites: [], hidden: [] };

function storageKey(userId: string | null) {
  return `${STORAGE_PREFIX}:${userId ?? 'guest'}`;
}

function reportIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)));
}

export function readReportPreferences(userId: string | null): ReportPreferences {
  if (typeof window === 'undefined') return EMPTY_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    if (!stored) return EMPTY_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<ReportPreferences>;
    return {
      favorites: reportIds(parsed.favorites),
      hidden: reportIds(parsed.hidden),
    };
  } catch {
    return EMPTY_PREFERENCES;
  }
}

export function writeReportPreferences(userId: string | null, preferences: ReportPreferences) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify({
      favorites: reportIds(preferences.favorites),
      hidden: reportIds(preferences.hidden),
    }));
  } catch {
    // Browsing remains usable when storage is blocked or full.
  }
}
