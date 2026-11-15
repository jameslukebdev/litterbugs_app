import 'server-only';
import { cache } from 'react';

import type { Database, Report } from '@litterbugs/report-contract';

import { loadReportCommunity } from './report-communities';
import { getSiteUrl } from '@/lib/env';
import {
  isPubliclyShareableReport,
  isExpiredPublicReport,
  type PublicReportShareModel,
} from '@/lib/public-report-share-model';
import { PAGE_TOWN_WAIT_MS, publicReportPlace } from '@/lib/public-report-place';
import { publicReportPath } from '@/lib/public-report-url';
import { lookupReportAddress } from '@/lib/report-town-lookup';
import { createPublicClient } from '@/lib/supabase/public';
import { embedSocialCardPhoto, loadSocialCardPhoto } from '@/lib/social-card-photo';
import { loadLocalHistoryPhotoPreview } from '@/lib/local-history-photo-preview';

type Profile = Database['public']['Tables']['profiles']['Row'];
type CleanupAttempt = Database['public']['Tables']['cleanup_attempts']['Row'];
type CleanupSubmission = Database['public']['Tables']['cleanup_submissions']['Row'];
type CleanupSubmissionPhoto = Database['public']['Tables']['cleanup_submission_photos']['Row'];
function displayName(profile: Pick<Profile, 'display_name' | 'username'> | null) {
  return profile?.display_name?.trim()
    || (profile?.username?.trim() ? `@${profile.username.trim()}` : null);
}

function reportNotes(report: Report) {
  const notes = [
    ...(report.notes_presets ?? []),
    report.notes_other,
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value));

  return notes.length ? notes.join(' · ') : null;
}

function litterTypes(report: Report) {
  return [
    ...(report.litter_types ?? []),
    ...(report.types?.trim() ? [report.types.trim()] : []),
  ];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Request-scoped only: metadata and the page can share reads, while a later
// photo request always rechecks current publication and visibility through RLS.
const loadPublicReportData = cache(async (reportId: string) => {
  if (!UUID_PATTERN.test(reportId)) return null;

  const supabase = createPublicClient();
  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('is_sample', false)
    .eq('is_published', true)
    .maybeSingle();

  if (reportError) throw reportError;
  const report = reportData as Report | null;
  if (!report || !isPubliclyShareableReport(report)) return null;

  // Independent of cleanup evidence: start this read now instead of adding a
  // final database round trip after all completion details have arrived.
  const reporterPromise = report.user_id
    ? Promise.resolve(supabase.from('profiles').select('display_name, username').eq('id', report.user_id).maybeSingle())
      .catch(() => ({ data: null }))
    : Promise.resolve({ data: null });

  let attempt: Pick<CleanupAttempt, 'id' | 'cleaner_id' | 'claimed_at' | 'completed_at' | 'final_submission_id'> | null = null;
  let submission: Pick<CleanupSubmission, 'description' | 'bags_or_items_removed' | 'weight_pounds' | 'duration_minutes'> | null = null;
  let cleaner: Pick<Profile, 'display_name' | 'username'> | null = null;
  let afterPhoto: Pick<CleanupSubmissionPhoto, 'storage_path'> | null = null;
  let afterPhotoCount = 0;

  if (report.cleanup_state === 'completed') {
    const { data: attemptData } = await supabase
      .from('cleanup_attempts')
      .select('id, cleaner_id, claimed_at, completed_at, final_submission_id')
      .eq('report_id', report.id)
      .eq('status', 'completed')
      .not('final_submission_id', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    attempt = attemptData;
    if (attempt?.final_submission_id) {
      const [submissionResult, cleanerResult, photoResult] = await Promise.all([
        supabase
          .from('cleanup_submissions')
          .select('description, bags_or_items_removed, weight_pounds, duration_minutes')
          .eq('id', attempt.final_submission_id)
          .eq('cleanup_attempt_id', attempt.id)
          .maybeSingle(),
        attempt.cleaner_id
          ? supabase
            .from('profiles')
            .select('display_name, username')
            .eq('id', attempt.cleaner_id)
            .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('cleanup_submission_photos')
          .select('storage_path')
          .eq('submission_id', attempt.final_submission_id)
          .order('display_order', { ascending: true })
          .limit(MAX_PUBLIC_PHOTOS),
      ]);

      submission = submissionResult.data;
      cleaner = cleanerResult.data;
      // Photos are addressed by position, so the count is every row up to the page's limit.
      const afterPhotos = photoResult.data ?? [];
      afterPhoto = afterPhotos[0] ?? null;
      afterPhotoCount = afterPhoto?.storage_path ? afterPhotos.length : 0;
    }
  }

  const { data: reporter } = await reporterPromise;

  const expired = isExpiredPublicReport(report);
  const community = await loadReportCommunity(report.id);
  // The town: the community's main town when it is named after one, else the OpenStreetMap lookup.
  const [place, address] = await Promise.all([
    publicReportPlace(report.latitude, report.longitude, PAGE_TOWN_WAIT_MS, community),
    lookupReportAddress(report.latitude, report.longitude, PAGE_TOWN_WAIT_MS),
  ]);
  const model: PublicReportShareModel = {
    id: report.id,
    state: expired ? 'expired' : report.cleanup_state === 'completed' ? 'completed' : report.cleanup_state === 'available' ? 'available' : 'in_progress',
    fundingEligible: !expired && report.cleanup_state === 'available' && report.funding_eligibility === 'eligible' && report.renewal_status === 'active' && !report.funding_frozen_at && !report.cancelled_at && !report.expired_at,
    rewardCents: !expired && report.cleanup_state === 'available' && report.funding_eligibility === 'eligible' ? Math.max(0, report.funded_amount_cents || 0) : 0,
    title: report.title?.trim() || 'Litter Report',
    generalLocation: place?.label ?? 'Location shown on the map',
    // The street lookup can name a hamlet inside the town (e.g. "Moretz" within Boone); the address
    // line uses the same town as the rest of the page so the two never disagree.
    address: address && place && address.locality !== place.locality
      ? { ...address, locality: place.locality,
        line: [address.street, place.locality, [address.region, address.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ') }
      : address,
    location: report.latitude != null && report.longitude != null && Number.isFinite(report.latitude) && Number.isFinite(report.longitude)
      ? { latitude: report.latitude, longitude: report.longitude } : null,
    // The town's leaderboard, once that community is public.
    ...(community?.isPublic ? { community: { slug: community.slug, path: community.path, name: community.name } } : {}),
    localityLabel: place?.localityLabel,
    place: place ? { locality: place.locality, region: place.region, countryCode: place.countryCode } : undefined,
    severity: report.severity,
    reporterName: displayName(reporter) || 'Community member',
    reporterId: report.user_id,
    notes: reportNotes(report),
    litterTypes: litterTypes(report),
    reportDate: report.created_at,
    expiredDate: expired ? report.expired_at ?? report.expires_at : null,
    cleanerName: displayName(cleaner),
    cleanerId: cleaner ? attempt?.cleaner_id ?? null : null,
    completionDate: attempt?.completed_at ?? null,
    claimedDate: attempt?.claimed_at ?? null,
    // Set once, when the first contribution succeeds.
    fundedDate: report.funding_locked_at ?? null,
    cleanupDescription: submission?.description ?? null,
    bagsOrItemsRemoved: submission?.bags_or_items_removed ?? null,
    weightPounds: submission?.weight_pounds ?? null,
    cleanupMinutes: submission?.duration_minutes ?? null,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    afterPhotoCount,
    photoCount: Math.min(MAX_PUBLIC_PHOTOS, (report.photo_paths ?? []).filter(Boolean).length),
    canonicalUrl: `${getSiteUrl()}${publicReportPath(report.id, report.title?.trim() || 'Litter Report', place?.localityLabel)}`,
  };

  return { model, beforePath: report.photo_paths?.[0], afterPath: afterPhoto?.storage_path };
});

export async function loadPublicReportShare(
  reportId: string,
  photos: 'embedded' | 'linked' = 'embedded',
): Promise<PublicReportShareModel | null> {
  const data = await loadPublicReportData(reportId);
  if (!data) return null;

  if (photos === 'linked') {
    const photoBase = `/reports/${encodeURIComponent(data.model.id)}/photo`;
    return {
      ...data.model,
      beforePhotoUrl: data.beforePath ? `${photoBase}/before` : null,
      afterPhotoUrl: data.afterPath ? `${photoBase}/after` : null,
    };
  }

  const supabase = createPublicClient();
  const preview = data.model.state === 'expired' && data.beforePath
    ? await loadLocalHistoryPhotoPreview(reportId, data.beforePath, 1080) : null;
  const [beforePhotoUrl, afterPhotoUrl] = await Promise.all([
    preview ? Promise.resolve(`data:image/jpeg;base64,${preview.toString('base64')}`)
      : embedSocialCardPhoto(supabase, 'report_photos', data.beforePath),
    embedSocialCardPhoto(supabase, 'cleanup_photos', data.afterPath),
  ]);
  return { ...data.model, beforePhotoUrl, afterPhotoUrl };
}

/** Report cards page through at most this many report photos. */
export const MAX_PUBLIC_PHOTOS = 10;

export async function loadPublicReportPhoto(reportId: string, kind: 'before' | 'after', width: 640 | 1080 = 1080, index = 0) {
  if (!UUID_PATTERN.test(reportId) || !Number.isInteger(index) || index < 0 || index >= MAX_PUBLIC_PHOTOS) return null;
  const supabase = createPublicClient();
  const { data: report, error } = await supabase.from('reports')
    .select('*').eq('id', reportId).eq('is_sample', false).eq('is_published', true).maybeSingle();
  if (error) throw error;
  if (!report || !isPubliclyShareableReport(report)) return null;
  let path: string | undefined = (report.photo_paths ?? []).filter(Boolean)[kind === 'before' ? index : 0];
  if (kind === 'after') {
    if (report.cleanup_state !== 'completed') return null;
    const { data: attempt } = await supabase.from('cleanup_attempts')
      .select('id, final_submission_id').eq('report_id', reportId).eq('status', 'completed')
      .not('final_submission_id', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle();
    if (!attempt?.final_submission_id) return null;
    const { data: photo } = await supabase.from('cleanup_submission_photos')
      .select('storage_path').eq('submission_id', attempt.final_submission_id)
      .order('display_order', { ascending: true }).range(index, index).maybeSingle();
    path = photo?.storage_path;
  }
  if (!path) return null;
  if (kind === 'before' && isExpiredPublicReport(report)) {
    const preview = await loadLocalHistoryPhotoPreview(reportId, path, width);
    if (preview) return preview;
  }
  return loadSocialCardPhoto(supabase, kind === 'before' ? 'report_photos' : 'cleanup_photos', path, width);
}
