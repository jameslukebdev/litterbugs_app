'use client';
import { createPreferenceSync, type SyncedPreferences } from '@litterbugs/report-contract';
import { createClient } from './supabase/client';
import { readReportPreferences } from './report-preferences';

export const reportPreferenceSync = createPreferenceSync({
  read: async owner => window.localStorage.getItem(`litterbugs.preferences.v2:${owner}`),
  write: async (owner, value) => window.localStorage.setItem(`litterbugs.preferences.v2:${owner}`, value),
  legacy: async owner => readReportPreferences(owner === 'guest' ? null : owner),
  id: () => crypto.randomUUID(),
  exclusive: async (owner, work) => navigator.locks ? navigator.locks.request(`litterbugs.preferences:${owner}`, work) : work(),
  remote: async (owner, seed, operations) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const { data, error } = await createClient().rpc('sync_report_preferences', { target_user_id: owner, seed, operations }).abortSignal(controller.signal);
      if (error) throw error;
      return data as SyncedPreferences;
    } finally { clearTimeout(timer); }
  },
});
