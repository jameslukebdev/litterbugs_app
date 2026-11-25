'use client';
import { reportInsertFromDraft, type ReportDraft, type Coordinates, type Json } from '@litterbugs/report-contract';
import { createClient } from './supabase/client';
import { requireReportLocation } from './geolocation';
import { uploadSecureBrowserMedia } from './secure-media-upload';
import { alreadyReportedId } from './report-site-model';
import { loadSiteReportPublication, saveSiteReportPublication, clearSiteReportPublication } from './saved-report-draft';

export async function submitSiteReport(sourceId: string, draft: ReportDraft, coordinates: Coordinates, local: boolean, progress: (message: string) => void) {
  const client = createClient();
  const { data } = await client.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) throw new Error('Sign in to report litter.');
  if (local) {
    if (process.env.NODE_ENV !== 'development' || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) throw new Error('Local reporting unavailable.');
    progress('Checking your current location…');
    const origin = await requireReportLocation(coordinates);
    const key = `litterbugs.local-site-submission.${sourceId}.${user.id}`;
    const id = localStorage.getItem(key) || crypto.randomUUID();
    localStorage.setItem(key, id);
    const data = new FormData();
    data.set('id', id);
    data.set('sourceId', sourceId);
    data.set('origin', JSON.stringify(origin));
    data.set('draft', JSON.stringify({ ...draft, photos: [] }));
    draft.photos.forEach(photo => data.append('photos', photo));
    progress('Saving report…');
    const response = await fetch('/api/local/site-reports', { method: 'POST', body: data, credentials: 'same-origin' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Report could not be saved.');
    localStorage.removeItem(key);
    return result as { reportId: string; alreadyReported: boolean };
  }
  const fingerprint = JSON.stringify({ ...draft, photos: await Promise.all(draft.photos.map(async photo => ({
    name: photo.name, type: photo.type,
    hash: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await photo.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join(''),
  }))) });
  // Separate from an ordinary draft. Never consume or discard a report the member
  // was already composing elsewhere. IndexedDB keeps the uncertain publication ID.
  let journal = await loadSiteReportPublication(sourceId, user.id);
  if (journal) {
    const { data: existing, error } = await client.from('reports').select('id,is_published').eq('id', journal.reportId).eq('user_id', user.id).maybeSingle();
    if (error) throw new Error('Your previous submission could not be checked. Try again.');
    if (existing?.is_published) { await clearSiteReportPublication(sourceId, user.id); return { reportId: existing.id, alreadyReported: false }; }
  }
  progress('Checking your current location…');
  await requireReportLocation(coordinates);
  // Once an uncertain commit has been checked, edited evidence gets a new private
  // reservation. Never publish old metadata or photo paths under a changed form.
  if (!journal || journal.fingerprint !== fingerprint) journal = { userId: user.id, sourceId, reportId: crypto.randomUUID(), paths: [], draft, fingerprint };
  await saveSiteReportPublication(journal);
  const fields = reportInsertFromDraft(draft, coordinates, user.id);
  const { data: reserved, error: reserveError } = await client.rpc('reserve_site_report', { source_report_id: sourceId, new_report_id: journal.reportId, draft: fields as Json });
  const duplicate = alreadyReportedId(reserveError);
  if (duplicate) { await clearSiteReportPublication(sourceId, user.id); return { reportId: duplicate, alreadyReported: true }; }
  if (reserveError || !reserved) throw new Error('This site could not be checked. Try again.');
  if (reserved.is_published) { await clearSiteReportPublication(sourceId, user.id); return { reportId: reserved.id, alreadyReported: false }; }
  if (!journal.paths.length) {
    const paths: string[] = [];
    for (const photo of draft.photos) {
      progress(`Uploading photos ${paths.length + 1} of ${draft.photos.length}…`);
      paths.push(await uploadSecureBrowserMedia({ supabase: client, userId: user.id, kind: 'report', file: photo, subjectId: reserved.id }));
    }
    journal = { ...journal, paths };
    await saveSiteReportPublication(journal);
  }
  const origin = await requireReportLocation(coordinates);
  progress('Publishing report…');
  const { data: published, error } = await client.rpc('publish_report', { target_report_id: reserved.id, target_photo_paths: journal.paths, current_latitude: origin.latitude, current_longitude: origin.longitude, location_captured_at: origin.capturedAt });
  const raced = alreadyReportedId(error);
  if (raced) { await clearSiteReportPublication(sourceId, user.id); return { reportId: raced, alreadyReported: true }; }
  if (error || !published) throw new Error('Publication is not confirmed. Try again to check the same report.');
  await clearSiteReportPublication(sourceId, user.id);
  return { reportId: published.id, alreadyReported: false };
}
