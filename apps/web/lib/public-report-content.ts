import type { PublicReportShareModel } from './public-report-share-model';

export function reportDateLabel(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value));
}

/** Only locality verified by the public geography model belongs in search copy. */
export function reportLocality(report: PublicReportShareModel) {
  return report.communitySlug && report.localityLabel?.trim() ? report.localityLabel.trim() : null;
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
    return `${report.title}. ${publicReportSummary(report)} ${publicReportOriginalSummary(report)}`.trim();
  }
  const evidence = report.state === 'completed' && report.beforePhotoUrl && report.afterPhotoUrl
    ? ' See before-and-after photos from the cleanup.' : '';
  return `${report.title}. ${publicReportSummary(report)}${evidence}`;
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
