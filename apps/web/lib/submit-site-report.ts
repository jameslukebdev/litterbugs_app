'use client';
import { reportInsertFromDraft, type ReportDraft, type Coordinates, type Json } from '@litterbugs/report-contract';
import { createClient } from './supabase/client';
import { requireReportLocation } from './geolocation';
import { uploadSecureBrowserMedia } from './secure-media-upload';
import { alreadyReportedId } from './report-site-model';
import { loadReportPublication, saveReportPublication, clearReportPublication } from './saved-report-draft';

export async function submitSiteReport(sourceId: string, draft: ReportDraft, coordinates: Coordinates, local: boolean, progress: (message: string) => void) {
  if (local) {
    if (process.env.NODE_ENV !== 'development' || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) throw new Error('Local test unavailable.');
    const key = `litterbugs.local-site-submission.${sourceId}`;
    const id = localStorage.getItem(key) || `f0000000-0000-4000-8000-${crypto.randomUUID().slice(-12)}`;
    localStorage.setItem(key, id);
    const data = new FormData();
    data.set('id', id);
    data.set('draft', JSON.stringify({ ...draft, photos: [] }));
    draft.photos.forEach(photo => data.append('photos', photo));
    progress('Saving report…');
    const response = await fetch('/api/local/report-sites', { method: 'POST', body: data, credentials: 'same-origin' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Report could not be saved.');
    localStorage.removeItem(key);
    return result as { reportId: string; alreadyReported: boolean };
  }
  const client = createClient();
  const { data } = await client.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) throw new Error('Sign in to report litter.');
  const key = `site:${sourceId}:${user.id}`;
  // Separate from an ordinary draft. Never consume or discard a report the member
  // was already composing elsewhere. IndexedDB keeps the uncertain publication ID.
  let journal = await loadReportPublication(key);
  if (journal) {
    const { data: existing, error } = await client.from('reports').select('id,is_published').eq('id', journal.reportId).eq('user_id', user.id).maybeSingle();
    if (error) throw new Error('Your previous submission could not be checked. Try again.');
    if (existing?.is_published) { await clearReportPublication(key); return { reportId: existing.id, alreadyReported: false }; }
  }
  progress('Checking your current location…');
  await requireReportLocation(coordinates);
  journal ??= { userId: user.id, reportId: crypto.randomUUID(), paths: [] };
  await saveReportPublication({ ...journal, userId: key });
  const fields = reportInsertFromDraft(draft, coordinates, user.id);
  const { data: reserved, error: reserveError } = await client.rpc('reserve_site_report', { source_report_id: sourceId, new_report_id: journal.reportId, draft: fields as Json });
  const duplicate = alreadyReportedId(reserveError);
  if (duplicate) { await clearReportPublication(key); return { reportId: duplicate, alreadyReported: true }; }
  if (reserveError || !reserved) throw new Error('This site could not be checked. Try again.');
  if (reserved.is_published) { await clearReportPublication(key); return { reportId: reserved.id, alreadyReported: false }; }
  if (!journal.paths.length) {
    const paths: string[] = [];
    for (const photo of draft.photos) {
      progress(`Uploading photos ${paths.length + 1} of ${draft.photos.length}…`);
      paths.push(await uploadSecureBrowserMedia({ supabase: client, userId: user.id, kind: 'report', file: photo, subjectId: reserved.id }));
    }
    journal = { ...journal, paths };
    await saveReportPublication({ ...journal, userId: key });
  }
  const origin = await requireReportLocation(coordinates);
  progress('Publishing report…');
  const { data: published, error } = await client.rpc('publish_report', { target_report_id: reserved.id, target_photo_paths: journal.paths, current_latitude: origin.latitude, current_longitude: origin.longitude, location_captured_at: origin.capturedAt });
  const raced = alreadyReportedId(error);
  if (raced) { await clearReportPublication(key); return { reportId: raced, alreadyReported: true }; }
  if (error || !published) throw new Error('Publication is not confirmed. Try again to check the same report.');
  await clearReportPublication(key);
  return { reportId: published.id, alreadyReported: false };
}
