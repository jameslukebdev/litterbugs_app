import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createPreferenceSync } from '@litterbugs/report-contract';
import { loadReportFavorites } from './reportFavorites';
import { supabase } from './supabase';

export const reportPreferenceSync = createPreferenceSync({
  read: owner => AsyncStorage.getItem(`litterbugs.preferences.v2:${owner}`),
  write: (owner, value) => AsyncStorage.setItem(`litterbugs.preferences.v2:${owner}`, value),
  legacy: async owner => ({ favorites: await loadReportFavorites(owner), hidden: [] }),
  id: () => Crypto.randomUUID(),
  remote: async (owner, seed, operations) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const { data, error } = await supabase.rpc('sync_report_preferences', { target_user_id: owner, seed, operations }).abortSignal(controller.signal);
      if (error) throw error;
      return data;
    } finally { clearTimeout(timer); }
  },
});
