import type { PublicReportShareModel } from './public-report-share-model';

export function reportDateLabel(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value));
}

/** Only locality verified by the public geography model belongs in search copy. */
export function reportLocality(report: PublicReportShareModel) {
  return (report.communitySlug || report.place) && report.localityLabel?.trim() ? report.localityLabel.trim() : null;
}

export function publicReportSearchTitle(report: PublicReportShareModel) {
  const status = report.state === 'expired' ? 'Litter report history' : report.state === 'completed' ? 'Completed cleanup'
    : report.state === 'in_progress' ? 'Cleanup in progress' : 'Litter report';
  const locality = reportLocality(report);
  return `${report.title} — ${status}${locality ? ` near ${locality}` : ''}`;
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

export function publicReportSearchDescription(report: PublicReportShareModel) {
  if (report.state === 'expired') {
    return `${report.title}. ${publicReportSummary(report)} ${publicReportOriginalSummary(report)}`.trim() + ' A cleanup has not been confirmed.';
  }
  const evidence = report.state === 'completed' && report.beforePhotoUrl && report.afterPhotoUrl
    ? ' See before-and-after photos from the cleanup.' : '';
  // The same sentence the page opens with, then what the litter is and how many photos show it.
  const types = report.litterTypes.map(value => value.trim().toLowerCase()).filter(Boolean);
  const litter = types.length ? ` Reported litter: ${types.length > 4 ? `${types.slice(0, 4).join(', ')} and more` : listFormat.format(types)}.` : '';
  const photos = (report.beforePhotoUrl ? Math.max(1, report.photoCount ?? 1) : 0) + (report.afterPhotoUrl ? Math.max(1, report.afterPhotoCount ?? 1) : 0);
  const shown = evidence || (photos > 0 ? ` ${photos} ${photos === 1 ? 'photo' : 'photos'}.` : '');
  return `${report.title}. ${publicReportStorySummary(report)}${litter}${shown}`;
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
  if (report.state === 'expired') return publicReportSearchDescription(report);
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
