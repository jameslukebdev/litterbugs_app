import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { requireReportLocation } from './reportLocationCheck';
import { submitRecoverableReport } from './reportSubmission';
import { saveSiteReportDraft, loadSiteReportDraft } from './siteReportDraft';
import { alreadyReportedId } from './reportSites';
const key = (sourceId, userId) => `litterbugs.site-report-submission.${sourceId}.${userId}`;
export const clearSiteReportSubmission = (sourceId, userId) => AsyncStorage.removeItem(key(sourceId, userId));
const inFlight = new Map();
async function publish({ sourceId, userId, payload, form, coordinate, upload, onProgress }) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user || auth.user.is_anonymous || auth.user.id !== userId) throw new Error('Sign in to report litter.');
  const journalKey = key(sourceId, userId);
  let journal = JSON.parse(await AsyncStorage.getItem(journalKey) || 'null');
  if (journal) {
    if (journal.sourceId !== sourceId || journal.userId !== userId) throw new Error('The saved report could not be checked.');
    const { data, error } = await supabase.from('reports').select('*').eq('id', journal.id).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (data?.is_published) return { report: data, alreadyReported: false };
  }
  await requireReportLocation(Location, coordinate);
  await saveSiteReportDraft(sourceId, userId, { form, coordinate, step: 4 });
  const saved = await loadSiteReportDraft(sourceId, userId);
  if (!saved || saved.missingPhotoCount || !saved.form.photos.length) throw new Error('Add your report photos again.');
  const photoHashes = await Promise.all(saved.form.photos.map(async uri => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }))));
  const fingerprint = JSON.stringify({ payload, photoHashes });
  // Resolve an uncertain commit first. Edited inputs then get a fresh private
  // reservation, never the old metadata or evidence under a changed form.
  if (!journal || journal.fingerprint !== fingerprint) journal = { id: Crypto.randomUUID(), userId, sourceId, fingerprint, payload, photos: saved.form.photos, paths: [] };
  journal = { ...journal, photos: saved.form.photos };
  try {
    const report = await submitRecoverableReport({
      journal, onProgress,
      persist: value => AsyncStorage.setItem(journalKey, JSON.stringify(value)),
      reserve: async (id, draft) => {
        const { data, error } = await supabase.rpc('reserve_site_report', { source_report_id: sourceId, new_report_id: id, draft });
        if (error) throw error;
        return data;
      },
      upload: async (uri, id) => (await upload([uri], id, userId, onProgress))[0],
      publish: async (id, paths) => {
        const origin = await requireReportLocation(Location, coordinate);
        const { data, error } = await supabase.rpc('publish_report', { target_report_id: id, target_photo_paths: paths, current_latitude: origin.latitude, current_longitude: origin.longitude, location_captured_at: origin.capturedAt });
        if (error) throw error;
        return data;
      },
    });
    return { report, alreadyReported: false };
  } catch (error) {
    const existing = alreadyReportedId(error);
    if (!existing) throw error;
    const { data, error: readError } = await supabase.from('reports').select('*').eq('id', existing).single();
    if (readError) throw readError;
    return { report: data, alreadyReported: true };
  }
}
export function publishSiteReport(options) {
  const identity = key(options.sourceId, options.userId);
  if (inFlight.has(identity)) return inFlight.get(identity);
  const operation = publish(options).finally(() => inFlight.delete(identity));
  inFlight.set(identity, operation);
  return operation;
}
