import 'server-only';
import { cache } from 'react';

import type { Database, Report } from '@litterbugs/report-contract';

import { getSiteUrl } from '@/lib/env';
import {
  isPubliclyShareableReport,
  type PublicReportShareModel,
} from '@/lib/public-report-share-model';
import { createPublicClient } from '@/lib/supabase/public';
import { embedSocialCardPhoto, loadSocialCardPhoto } from '@/lib/social-card-photo';

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

  let attempt: Pick<CleanupAttempt, 'id' | 'cleaner_id' | 'completed_at' | 'final_submission_id'> | null = null;
  let submission: Pick<CleanupSubmission, 'description' | 'bags_or_items_removed' | 'weight_pounds'> | null = null;
  let cleaner: Pick<Profile, 'display_name' | 'username'> | null = null;
  let afterPhoto: Pick<CleanupSubmissionPhoto, 'storage_path'> | null = null;

  if (report.cleanup_state === 'completed') {
    const { data: attemptData } = await supabase
      .from('cleanup_attempts')
      .select('id, cleaner_id, completed_at, final_submission_id')
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
          .select('description, bags_or_items_removed, weight_pounds')
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
          .limit(1)
          .maybeSingle(),
      ]);

      submission = submissionResult.data;
      cleaner = cleanerResult.data;
      afterPhoto = photoResult.data;
    }
  }

  const model: PublicReportShareModel = {
    id: report.id,
    state: report.cleanup_state === 'completed' ? 'completed' : report.cleanup_state === 'available' ? 'available' : 'in_progress',
    rewardCents: report.cleanup_state === 'available' && report.funding_eligibility === 'eligible' ? Math.max(0, report.funded_amount_cents || 0) : 0,
    title: report.title?.trim() || 'Litter Report',
    generalLocation: 'Exact location shown only in Litterbugs',
    severity: report.severity,
    notes: reportNotes(report),
    litterTypes: litterTypes(report),
    reportDate: report.created_at,
    cleanerName: displayName(cleaner),
    completionDate: attempt?.completed_at ?? null,
    cleanupDescription: submission?.description ?? null,
    bagsOrItemsRemoved: submission?.bags_or_items_removed ?? null,
    weightPounds: submission?.weight_pounds ?? null,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    canonicalUrl: `${getSiteUrl()}/reports/${encodeURIComponent(report.id)}`,
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
  const [beforePhotoUrl, afterPhotoUrl] = await Promise.all([
    embedSocialCardPhoto(supabase, 'report_photos', data.beforePath),
    embedSocialCardPhoto(supabase, 'cleanup_photos', data.afterPath),
  ]);
  return { ...data.model, beforePhotoUrl, afterPhotoUrl };
}

export async function loadPublicReportPhoto(reportId: string, kind: 'before' | 'after') {
  const data = await loadPublicReportData(reportId);
  if (!data) return null;

  // Only the first public report photo or the completed attempt's final evidence
  // is addressable. Callers cannot supply a Storage bucket, path or submission.
  const path = kind === 'before' ? data.beforePath : data.afterPath;
  if (!path) return null;
  return loadSocialCardPhoto(
    createPublicClient(),
    kind === 'before' ? 'report_photos' : 'cleanup_photos',
    path,
  );
}
