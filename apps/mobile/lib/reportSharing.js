const PUBLIC_REPORT_BASE_URL = 'https://litterbugs.app/reports';
export const LITTERBUGS_META_APP_ID = '1477683410862512';
const REPORT_SHARE_IMAGE_MIME_TYPE = 'image/png';

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
  if (report?.is_sample || report?.cancelled_at || report?.expired_at) return false;
  if (report?.cleanup_state === 'completed') return true;
  if (report?.cleanup_state !== 'available') return false;
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
    id: String(report.id),
    state: completed ? 'completed' : 'active',
    title: cleanText(report.title) || 'Litter Report',
    reportUrl: `${PUBLIC_REPORT_BASE_URL}/${encodeURIComponent(report.id)}`,
    shareImageUrl: `${PUBLIC_REPORT_BASE_URL}/${encodeURIComponent(report.id)}/share-image`,
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

export function reportShareImageFilename(model) {
  const slug = cleanText(model?.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const state = model?.state === 'completed' ? 'completed' : 'active';
  const id = cleanText(model?.id).replace(/[^a-z0-9-]/gi, '').slice(0, 18) || 'report';
  return `litterbugs-share-v2-${slug || 'cleanup-report'}-${state}-${id}.png`;
}

function responseHeader(headers, name) {
  const match = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );
  return match?.[1] ?? null;
}

export async function prepareNativeReportShareImage({
  model,
  cacheDirectory,
  deleteAsync,
  getInfoAsync,
  downloadAsync,
  timeoutMs = 20000,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  if (!model?.shareImageUrl || !cacheDirectory || !downloadAsync) return null;

  const destination = `${cacheDirectory.replace(/\/$/, '')}/${reportShareImageFilename(model)}`;

  if (getInfoAsync) {
    const existing = await getInfoAsync(destination);
    if (existing?.exists && Number(existing.size) > 0) return destination;
  }

  let timeoutId;
  try {
    const result = await Promise.race([
      downloadAsync(model.shareImageUrl, destination),
      new Promise((_, reject) => {
        timeoutId = setTimeoutFn(
          () => reject(new Error('report_share_image_timeout')),
          timeoutMs
        );
      }),
    ]);
    const mimeType = cleanText(
      result?.mimeType || responseHeader(result?.headers, 'content-type')
    ).toLowerCase();
    const validStatus = Number(result?.status) >= 200 && Number(result?.status) < 300;
    const validImage = mimeType === REPORT_SHARE_IMAGE_MIME_TYPE;

    if (!validStatus || !validImage) {
      if (deleteAsync) {
        await deleteAsync(result?.uri || destination, { idempotent: true }).catch(() => {});
      }
      throw new Error('report_share_image_invalid_response');
    }

    return result?.uri || destination;
  } finally {
    if (timeoutId !== undefined) clearTimeoutFn(timeoutId);
  }
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

export function createNativeReportShareContent(model, platform, shareImageUri = null) {
  const title = model?.state === 'completed'
    ? 'Litterbugs cleanup complete'
    : 'Litterbugs cleanup needed';

  if (shareImageUri) {
    return {
      title,
      subject: title,
      message: formatReportShareMessage(model),
      url: shareImageUri,
      type: REPORT_SHARE_IMAGE_MIME_TYPE,
      filename: reportShareImageFilename(model),
      failOnCancel: false,
      useInternalStorage: true,
    };
  }

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

export function reportShareActionLabel(report) {
  return report?.cleanup_state === 'completed' ? 'Share Your Impact' : 'Share';
}

export async function shareReportWithSystemSheet({
  report,
  impact = null,
  beforePhotoUrl = null,
  afterPhotoUrl = null,
  platform,
  share,
  shareImageUri = null,
  dismissedAction = 'dismissedAction',
}) {
  const model = createReportShareModel({
    report,
    impact,
    beforePhotoUrl,
    afterPhotoUrl,
  });

  if (!model) return { status: 'unavailable', model: null };

  const result = await share(
    createNativeReportShareContent(model, platform, shareImageUri),
    { dialogTitle: model.state === 'completed' ? 'Share cleanup impact' : 'Share cleanup report' }
  );

  return {
    status: result?.action === dismissedAction || result?.dismissedAction
      ? 'dismissed'
      : 'shared',
    model,
  };
}

export async function shareReportToInstagramStories({
  report,
  impact = null,
  beforePhotoUrl = null,
  afterPhotoUrl = null,
  shareImageUri,
  shareSingle,
  instagramStoriesSocial,
  appId = LITTERBUGS_META_APP_ID,
}) {
  const model = createReportShareModel({
    report,
    impact,
    beforePhotoUrl,
    afterPhotoUrl,
  });

  if (!model || !shareImageUri || !shareSingle || !instagramStoriesSocial) {
    return { status: 'unavailable', model };
  }

  const result = await shareSingle({
    social: instagramStoriesSocial,
    appId,
    backgroundImage: shareImageUri,
    attributionURL: model.reportUrl,
    linkUrl: model.reportUrl,
    linkText: model.state === 'completed' ? 'See the cleanup impact' : 'View cleanup report',
    backgroundTopColor: '#F8F3FA',
    backgroundBottomColor: '#FFF4EE',
  });

  return {
    status: result?.success === false ? 'dismissed' : 'shared',
    model,
  };
}
