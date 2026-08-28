const PUBLIC_REPORT_BASE_URL = 'https://litterbugs.app/reports';

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function truncateText(value, maximumLength = 220) {
  const text = cleanText(value);
  if (text.length <= maximumLength) return text;
  return `${text.slice(0, maximumLength - 1).trimEnd()}…`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function cleanerDisplayName(profile) {
  return cleanText(profile?.display_name)
    || (cleanText(profile?.username) ? `@${cleanText(profile.username)}` : '')
    || 'a Litterbugs volunteer';
}

function reportNotes(report) {
  const details = [
    ...(Array.isArray(report?.notes_presets) ? report.notes_presets : []),
    report?.notes_other,
  ].map(cleanText).filter(Boolean);

  return truncateText(details.join(' · '));
}

export function isReportShareable(report, now = new Date()) {
  if (report?.cleanup_state === 'completed') return true;
  if (report?.cleanup_state !== 'available') return false;
  if (report?.cancelled_at || report?.expired_at) return false;
  if (!report?.expires_at) return true;

  const expiresAt = Date.parse(report.expires_at);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function createReportShareModel({
  report,
  impact = null,
  beforePhotoUrl = null,
  afterPhotoUrl = null,
}) {
  if (!isReportShareable(report)) return null;

  const completed = report.cleanup_state === 'completed';
  const submission = impact?.submission ?? null;
  const attempt = impact?.attempt ?? null;

  return {
    state: completed ? 'completed' : 'active',
    title: cleanText(report.title) || 'Litter Report',
    reportUrl: `${PUBLIC_REPORT_BASE_URL}/${encodeURIComponent(report.id)}`,
    generalLocation: 'Open Litterbugs to view the report location',
    severity: cleanText(report.severity) || null,
    reportNotes: reportNotes(report) || null,
    cleanerName: completed ? cleanerDisplayName(impact?.cleaner) : null,
    completionDate: completed ? formatDate(attempt?.completed_at) || null : null,
    cleanupDescription: completed ? truncateText(submission?.description) || null : null,
    impact: completed ? {
      bagsOrItemsRemoved: Number.isFinite(Number(submission?.bags_or_items_removed))
        ? Number(submission.bags_or_items_removed)
        : null,
      durationMinutes: Number.isFinite(Number(submission?.duration_minutes))
        ? Number(submission.duration_minutes)
        : null,
    } : null,
    photos: {
      before: beforePhotoUrl || null,
      after: completed ? afterPhotoUrl || null : null,
    },
    extensions: {
      funding: null,
    },
  };
}

function impactSummary(impact) {
  if (!impact) return '';
  const facts = [];

  if (impact.bagsOrItemsRemoved != null) {
    const amount = impact.bagsOrItemsRemoved;
    facts.push(`${amount} ${amount === 1 ? 'bag/item' : 'bags/items'} removed`);
  }
  if (impact.durationMinutes != null) {
    facts.push(`${impact.durationMinutes} minutes volunteered`);
  }

  return facts.join(' · ');
}

export function formatReportShareMessage(model, { includeUrl = true } = {}) {
  if (!model) return '';

  const lines = model.state === 'completed'
    ? [
      'Litterbugs · Cleanup complete',
      `“${model.title}” was cleaned by ${model.cleanerName}.`,
      `Location: ${model.generalLocation}`,
      model.completionDate ? `Completed: ${model.completionDate}` : null,
      model.cleanupDescription ? `Cleanup: ${model.cleanupDescription}` : null,
      impactSummary(model.impact) ? `Impact: ${impactSummary(model.impact)}` : null,
    ]
    : [
      'Litterbugs · Cleanup needed',
      `“${model.title}” needs a volunteer cleanup.`,
      `Location: ${model.generalLocation}`,
      model.severity ? `Severity: ${model.severity}` : null,
      model.reportNotes ? `Details: ${model.reportNotes}` : null,
    ];

  if (includeUrl) {
    lines.push(
      model.state === 'completed' ? 'See the impact story:' : 'View the report:',
      model.reportUrl
    );
  }

  return lines.filter(Boolean).join('\n');
}

export function createNativeReportShareContent(model, platform) {
  const title = model?.state === 'completed'
    ? 'Litterbugs cleanup complete'
    : 'Litterbugs cleanup needed';

  if (platform === 'ios') {
    return {
      title,
      message: formatReportShareMessage(model, { includeUrl: false }),
      url: model.reportUrl,
    };
  }

  return {
    title,
    message: formatReportShareMessage(model),
  };
}
