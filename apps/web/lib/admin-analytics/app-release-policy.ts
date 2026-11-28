// Explicit publication ledger, not a minimum build number: withdrawn builds
// and future review builds must never qualify just because they say production.
// When only a publication date is recorded, hold out that entire day rather
// than guessing which earlier events were public. Update after verified release.
export const APP_ANALYTICS_POLICY = 'public-releases-2026-11-15-v1';
export const APP_ANALYTICS_STARTED = '2026-11-12T05:00:00Z';
export const PUBLIC_APP_RELEASES = [
  { os: 'iOS', version: '2.1.0', build: '29', publishedOn: '2026-11-14', measuredFrom: '2026-11-14T19:32:49.554Z' },
  { os: 'Android', version: '2.1.0', build: '26', publishedOn: '2026-11-14', measuredFrom: '2026-11-15T05:00:00Z' },
  { os: 'Android', version: '2.1.1', build: '27', publishedOn: '2026-11-15', measuredFrom: '2026-11-15T12:47:34.082Z' },
] as const;

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const utcTime = (value: string) => `toDateTime(${literal(new Date(Math.ceil(Date.parse(value) / 1000) * 1000).toISOString().slice(0, 19).replace('T', ' '))}, 'UTC')`;
const releaseIdentity = (release: typeof PUBLIC_APP_RELEASES[number]) =>
  `(properties.$os_name = ${literal(release.os)} AND properties.$app_version = ${literal(release.version)} AND properties.$app_build = ${literal(release.build)})`;

export function publicAppReleaseFilter() {
  return `(${PUBLIC_APP_RELEASES.map(release => `(${releaseIdentity(release)} AND timestamp >= ${utcTime(release.measuredFrom)})`).join(' OR ')})`;
}

// Anonymous install identity stays within PostHog. Exclude known test installs
// after they move onto a public build too. Do not infer staff from geography,
// repeat visits, or activity on an uncertain publication day.
export function internalAppInstallFilter(end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error('Invalid analytics window');
  const beforePublicationDay = PUBLIC_APP_RELEASES.map(release =>
    `(${releaseIdentity(release)} AND timestamp < toDateTime(${literal(`${release.publishedOn} 00:00:00`)}, 'America/New_York'))`);
  const neverPublished = "(properties.$app_version = '2.1.0' AND ((properties.$os_name = 'iOS' AND properties.$app_build IN ('27', '28')) OR (properties.$os_name = 'Android' AND properties.$app_build = '25')))";
  return `distinct_id NOT IN (
    SELECT distinct_id FROM events
    WHERE timestamp >= ${utcTime(APP_ANALYTICS_STARTED)}
      AND timestamp < toDateTime('${end} 00:00:00', 'America/New_York') + INTERVAL 1 DAY
      AND properties.surface = 'app'
      AND (${[neverPublished, ...beforePublicationDay].join(' OR ')})
  )`;
}

export function hasPublicAppRelease(window: { end: string }) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });
  return PUBLIC_APP_RELEASES.some(release => date.format(new Date(release.measuredFrom)) <= window.end);
}
