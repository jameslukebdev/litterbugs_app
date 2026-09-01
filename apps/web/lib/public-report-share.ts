import 'server-only';

import type { Database, Report } from '@litterbugs/report-contract';

import { getSiteUrl } from '@/lib/env';
import {
  isPubliclyShareableReport,
  type PublicReportShareModel,
} from '@/lib/public-report-share-model';
import { createClient } from '@/lib/supabase/server';

const SIGNED_PHOTO_DURATION_SECONDS = 60 * 60;

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

async function signedPhotoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: 'report_photos' | 'cleanup_photos',
  path: string | null | undefined,
) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_PHOTO_DURATION_SECONDS);

  return error ? null : data?.signedUrl ?? null;
}

export async function loadPublicReportShare(reportId: string): Promise<PublicReportShareModel | null> {
  if (!reportId) return null;

  const supabase = await createClient();
  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('is_sample', false)
    .maybeSingle();

  if (reportError) throw reportError;
  const report = reportData as Report | null;
  if (!report || !isPubliclyShareableReport(report)) return null;

  let attempt: Pick<CleanupAttempt, 'id' | 'cleaner_id' | 'completed_at' | 'final_submission_id'> | null = null;
  let submission: Pick<CleanupSubmission, 'description' | 'bags_or_items_removed' | 'duration_minutes'> | null = null;
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
          .select('description, bags_or_items_removed, duration_minutes')
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

  const [beforePhotoUrl, afterPhotoUrl] = await Promise.all([
    signedPhotoUrl(supabase, 'report_photos', report.photo_paths?.[0]),
    signedPhotoUrl(supabase, 'cleanup_photos', afterPhoto?.storage_path),
  ]);

  return {
    id: report.id,
    state: report.cleanup_state as 'available' | 'completed',
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
    durationMinutes: submission?.duration_minutes ?? null,
    beforePhotoUrl,
    afterPhotoUrl,
    canonicalUrl: `${getSiteUrl()}/reports/${encodeURIComponent(report.id)}`,
  };
}
