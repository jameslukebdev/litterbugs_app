import type { PublicReportShareModel } from './public-report-share-model';

export function reportDateLabel(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value));
}

/** Only locality verified by the public geography model belongs in search copy. */
export function reportLocality(report: PublicReportShareModel) {
  return report.place && report.localityLabel?.trim() ? report.localityLabel.trim() : null;
}

/** Search results show about 60 characters of a title and about 155 of a description. */
const TITLE_MAX = 65;
const TITLE_SUFFIX = ' | Litterbugs';
const DESCRIPTION_MAX = 155;

/** `text` cut to `max` characters at a word, with an ellipsis when anything was cut. */
function fitWords(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

function shortStatus(report: PublicReportShareModel) {
  return report.state === 'expired' ? 'past report' : report.state === 'completed' ? 'cleaned up'
    : report.state === 'in_progress' ? 'cleanup underway' : 'needs cleanup';
}

/**
 * The search and share title, without the site name: the report's name, its town and where the cleanup
 * stands, e.g. "Trash by the tracks, Greensboro – needs cleanup". The report's name is shortened, never the
 * town or status, so the whole title with " | Litterbugs" stays within what search results show.
 */
export function publicReportSearchTitle(report: PublicReportShareModel, max = TITLE_MAX) {
  const town = reportLocality(report) ? report.place?.locality?.trim() : null;
  const tail = `${town ? `, ${town}` : ''} – ${shortStatus(report)}`;
  return `${fitWords(report.title, Math.max(16, max - tail.length))}${tail}`;
}

/**
 * The page's own title: the search title with " | Litterbugs" when it fits whole. When the site name would
 * cut the report's name short, the site name is left out instead (search results show the site separately).
 */
export function publicReportPageTitle(report: PublicReportShareModel) {
  const full = publicReportSearchTitle(report);
  const withSite = `${full}${TITLE_SUFFIX}`;
  return withSite.length <= TITLE_MAX ? withSite : full;
}

export function publicReportSummary(report: PublicReportShareModel) {
  const locality = reportLocality(report);
  const where = locality ? ` near ${locality}` : '';
  if (report.state === 'expired') {
    const date = reportDateLabel(report.reportDate);
    return `Litter report recorded${where}${date ? ` on ${date}` : ''}.`;
  }
  if (report.state === 'completed') {
    const date = reportDateLabel(report.completionDate);
    return `Cleaned up${where}${date ? ` on ${date}` : ''}.`;
  }
  if (report.state === 'in_progress') {
    return `A cleanup is underway${where}.`;
  }
  return `This spot${where} needs a cleanup.`;
}

/**
 * The search description: where the cleanup stands and where, what someone can do, then the litter, in whole
 * sentences that fit in a search result (about 155 characters). The page itself tells the full story.
 */
export function publicReportSearchDescription(report: PublicReportShareModel) {
  const types = report.litterTypes.map(value => value.trim().toLowerCase()).filter(Boolean);
  const litter = types.length ? `Litter: ${types.length > 3 ? `${types.slice(0, 3).join(', ')} and more` : listFormat.format(types)}.` : '';
  const next = report.state === 'expired' ? 'A cleanup has not been confirmed.'
    : report.state === 'completed' ? (report.beforePhotoUrl && report.afterPhotoUrl ? 'See before-and-after photos.' : '')
      : report.state === 'in_progress' ? ''
        : report.rewardCents && report.rewardCents > 0 ? `Its cleanup fund holds $${(report.rewardCents / 100).toFixed(2)}.`
          : report.fundingEligible ? 'Fund it or clean it up on Litterbugs.' : 'Volunteers can clean it up on Litterbugs.';
  const [first, ...rest] = [publicReportSummary(report), next, litter].filter(Boolean);
  let description = fitWords(first, DESCRIPTION_MAX);
  for (const sentence of rest) {
    if (description.length + 1 + sentence.length <= DESCRIPTION_MAX) description += ` ${sentence}`;
  }
  return description;
}

const listFormat = new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' });

function removedPhrase(report: PublicReportShareModel) {
  // Weight reads most naturally in a sentence; the count stays in the page's facts.
  const amount = report.weightPounds != null && report.weightPounds > 0
    ? `${report.weightPounds} ${report.weightPounds === 1 ? 'pound' : 'pounds'}`
    : report.bagsOrItemsRemoved != null && report.bagsOrItemsRemoved > 0
      ? `${report.bagsOrItemsRemoved} ${report.bagsOrItemsRemoved === 1 ? 'bag or item' : 'bags or items'}` : null;
  // Amounts are the cleaner's own figures, so the sentence says "reported".
  return amount ? `, and reported removing ${amount} of litter` : '';
}

/** How long the cleaner said the work took, in words: "35 minutes", "1 hour", "2.5 hours". */
function cleanupDuration(report: PublicReportShareModel) {
  const minutes = report.cleanupMinutes;
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return '';
  if (minutes < 60) return ` The cleanup took ${Math.round(minutes)} ${Math.round(minutes) === 1 ? 'minute' : 'minutes'}.`;
  const hours = Math.round(minutes / 6) / 10;
  return ` The cleanup took ${hours} ${hours === 1 ? 'hour' : 'hours'}.`;
}

/** How long the spot waited, from the two recorded timestamps; nothing when either is missing or out of order. */
function cleanupDelay(report: PublicReportShareModel) {
  const reported = Date.parse(report.reportDate ?? '');
  const cleaned = Date.parse(report.completionDate ?? '');
  if (!Number.isFinite(reported) || !Number.isFinite(cleaned) || cleaned < reported) return '';
  const days = Math.floor((cleaned - reported) / 86_400_000);
  return days === 0 ? ' It was cleaned up within a day of being reported.'
    : ` It was cleaned up ${days} ${days === 1 ? 'day' : 'days'} after it was reported.`;
}

/**
 * One plain sentence that states who did what, where and when, for readers and
 * answer engines that quote a single line. Built only from recorded fields;
 * expired reports already have sentence-form history, so they return ''.
 */
export function publicReportStorySummary(report: PublicReportShareModel) {
  const locality = reportLocality(report);
  // With a street on record the sentence names it: "near Stadium Drive in Boone, North Carolina".
  const street = locality ? report.address?.street?.trim() : null;
  const where = locality ? ` near ${street ? `${street} in ` : ''}${locality}` : '';
  const reported = reportDateLabel(report.reportDate);
  const reporter = report.reporterName?.trim() && report.reporterName.trim() !== 'Community member'
    ? report.reporterName.trim() : 'A community member';
  if (report.state === 'expired') {
    // Who, where and when only: the page's history section states the outcome in its own careful words.
    return `${reporter} reported litter at this spot${where}${reported ? `${locality ? ',' : ''} on ${reported}` : ''}.`;
  }
  if (report.state === 'completed') {
    const date = reportDateLabel(report.completionDate);
    return `${report.cleanerName?.trim() || 'A Litterbugs member'} cleaned up this spot${where}${date ? `${locality ? ',' : ''} on ${date}` : ''}${removedPhrase(report)}.${cleanupDuration(report)}${cleanupDelay(report)}`;
  }
  if (report.state === 'in_progress') {
    return `A cleanup is underway at this spot${where}${reported ? `, which was reported on ${reported}` : ''}.`;
  }
  // An open report says who raised it and what would move it forward.
  const next = report.rewardCents && report.rewardCents > 0
    ? ` Its cleanup fund holds $${(report.rewardCents / 100).toFixed(2)}.`
    : report.fundingEligible ? ' It has no cleanup fund yet, so anyone can fund it or clean it up as a volunteer.'
      : ' It is a volunteer cleanup.';
  return `${reporter} reported litter at this spot${locality ? `${where},` : ''}${reported ? ` on ${reported},` : ''} and it still needs a cleanup.${next}`;
}

/** The story sentence with the title and reported litter, for use away from the page. */
export function publicReportStoryDescription(report: PublicReportShareModel) {
  // An expired report's search description already carries its evidence and outcome.
  if (report.state === 'expired') {
    return `${report.title}. ${publicReportSummary(report)} ${publicReportOriginalSummary(report)}`.trim() + ' A cleanup has not been confirmed.';
  }
  const story = publicReportStorySummary(report);
  const types = report.litterTypes.map(value => value.trim()).filter(Boolean);
  return `${report.title}. ${story}${types.length ? ` The report listed ${listFormat.format(types)}.` : ''}`;
}

/** Describe the retained evidence without supplying missing photos or geography. */
export function publicReportOriginalSummary(report: PublicReportShareModel) {
  const facts: string[] = [];
  const types = report.litterTypes.map(value => value.trim()).filter(Boolean);
  if (types.length) {
    facts.push(`The report identified ${new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' }).format(types)}.`);
  }
  if (report.notes?.trim()) {
    const notes = report.notes.trim().replace(/\s*·\s*/g, '; ');
    facts.push(`Recorded details: ${notes}${/[.!?]$/.test(notes) ? '' : '.'}`);
  }
  if (report.severity?.trim()) facts.push(`The reported priority was ${report.severity.trim().toLowerCase()}.`);
  return facts.join(' ');
}

export function publicReportHistorySummary(report: PublicReportShareModel) {
  const reported = reportDateLabel(report.reportDate);
  const expired = reportDateLabel(report.expiredDate ?? null);
  return [
    reported ? `The original report was submitted on ${reported}.` : null,
    expired ? `Its active reporting period ended on ${expired}.` : 'Its active reporting period has ended.',
    'A cleanup has not been confirmed.',
  ].filter(Boolean).join(' ');
}

export function publicReportPhotoDescription(report: PublicReportShareModel, kind: 'before' | 'after') {
  const locality = reportLocality(report);
  const subject = `“${report.title}”${locality ? ` near ${locality}` : ''}`;
  const after = kind === 'after';
  const label = after ? 'After' : report.state === 'completed' ? 'Before' : 'Report photo';
  const date = reportDateLabel(after ? report.completionDate : report.reportDate);
  return {
    label,
    // These describe the photo's association, without guessing what it depicts.
    alt: `${after ? 'Cleanup result photo' : 'Original report photo'} for ${subject}`,
    caption: date ? `${after ? 'Cleaned up' : 'Reported'} ${date}` : '',
  };
}
