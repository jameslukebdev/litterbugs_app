import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from './supabase';

// How many updates a member has not opened yet. One shared count feeds the bell on
// Profile and the dot on the Profile tab, so they always agree. It refreshes when
// asked (after an update is opened), when the app returns to the front, and every
// minute while the app is open.
let count = 0;
let owner = null;
const listeners = new Set();

const publish = (next) => {
  count = next;
  listeners.forEach((listener) => listener(count));
};

export async function refreshUnreadUpdates(userId = owner) {
  owner = userId ?? null;
  if (!owner) { publish(0); return 0; }
  const requestedFor = owner;
  try {
    const { count: unread, error } = await supabase
      .from('cleanup_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', requestedFor)
      .is('read_at', null);
    // Keep the last known count if the check fails or the member changed meanwhile.
    if (!error && unread !== null && owner === requestedFor) publish(unread);
  } catch {
    // Same: a failed check never clears or invents a count.
  }
  return count;
}

export function useUnreadUpdates(userId) {
  const [value, setValue] = useState(userId && owner === userId ? count : 0);
  useEffect(() => {
    listeners.add(setValue);
    refreshUnreadUpdates(userId ?? null);
    if (!userId) return () => { listeners.delete(setValue); };
    const timer = setInterval(() => refreshUnreadUpdates(userId), 60 * 1000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refreshUnreadUpdates(userId); });
    return () => { listeners.delete(setValue); clearInterval(timer); subscription.remove(); };
  }, [userId]);
  return userId ? value : 0;
}
