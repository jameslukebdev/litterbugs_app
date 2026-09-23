import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { requireReportLocation } from './reportLocationCheck';
import { supabase } from './supabase';
import { submitRecoverableReport } from './reportSubmission';
import { loadReportDraft, saveReportDraft } from './savedReportDraft';
const key = userId => `litterbugs.report-submission.${userId}`;
export const clearReportSubmission = userId => AsyncStorage.removeItem(key(userId));
async function publishReportDraftRequest({ userId, payload, form, coordinate, upload, onProgress }) {
  let journal = JSON.parse(await AsyncStorage.getItem(key(userId)) || 'null');
  if (journal) {
    // Resolve an uncertain publication before replacing its saved inputs.
    const { data: existing, error } = await supabase.from('reports').select('*').eq('id', journal.id).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (existing?.is_published) return existing;
  }
  const previous = journal;
  onProgress?.('Checking your current location…');
  await requireReportLocation(Location, coordinate);
  {
    await saveReportDraft(userId, { form, coordinate, step: 4 });
    const saved = await loadReportDraft(userId);
    journal = { id: previous?.id || Crypto.randomUUID(), payload, photos: saved.form.photos, paths: JSON.stringify(previous?.photos) === JSON.stringify(saved.form.photos) ? previous.paths : [] };
  }
  const result = await submitRecoverableReport({
    journal, onProgress,
    persist: value => AsyncStorage.setItem(key(userId), JSON.stringify(value)),
    reserve: async (id, fields) => {
      const { error } = await supabase.from('reports').upsert({ ...fields, id, user_id: userId, is_published: false }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
      const { data, error: readError } = await supabase.from('reports').select('*').eq('id', id).eq('user_id', userId).single();
      if (readError) throw readError;
      if (data.is_published) return data;
      const { error: updateError } = await supabase.from('reports').update({ title: fields.title, litter_types: fields.litter_types, types: fields.types, notes_presets: fields.notes_presets, notes_other: fields.notes_other, severity: fields.severity, latitude: fields.latitude, longitude: fields.longitude }).eq('id', id).eq('user_id', userId).eq('is_published', false);
      if (updateError) throw updateError;
      return data;
    },
    upload: async (uri, id) => (await upload([uri], id, userId, onProgress))[0],
    publish: async (id, paths) => {
      onProgress?.('Confirming your location and publishing…');
      const origin = await requireReportLocation(Location, coordinate);
      const { data, error } = await supabase.rpc('publish_report', {
        target_report_id: id,
        target_photo_paths: paths,
        current_latitude: origin.latitude,
        current_longitude: origin.longitude,
        location_captured_at: origin.capturedAt,
      });
      if (error) throw error;
      return data;
    },
  });
  return result;
}

const inFlight = new Map();
export function publishReportDraft(options) {
  if (inFlight.has(options.userId)) return inFlight.get(options.userId);
  const operation = publishReportDraftRequest(options).finally(() => inFlight.delete(options.userId));
  inFlight.set(options.userId, operation);
  return operation;
}
