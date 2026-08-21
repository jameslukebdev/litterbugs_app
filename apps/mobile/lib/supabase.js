import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';

import { authStorage } from './authStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase env vars. Check your .env file for EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // IMPORTANT for React Native
    flowType: 'pkce',
    lock: processLock,
  },
});

const authLifecycleKey = Symbol.for('litterbugs.supabase.auth-lifecycle');

if (Platform.OS !== 'web') {
  globalThis[authLifecycleKey]?.remove?.();

  const updateAuthRefresh = (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  };

  updateAuthRefresh(AppState.currentState);
  globalThis[authLifecycleKey] = AppState.addEventListener('change', updateAuthRefresh);
}
