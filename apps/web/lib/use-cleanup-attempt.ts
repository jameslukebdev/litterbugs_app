'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Database } from '@litterbugs/report-contract';
import { createClient } from '@/lib/supabase/client';

type Attempt = Database['public']['Tables']['cleanup_attempts']['Row'];
type Snapshot = { key: string; data: Attempt | null; checkedAt: number; failed: boolean };

/** A failed check is unknown, not proof that a customer's cleanup disappeared. */
export function useCleanupAttempt(reportId: string, userId: string | null, reviewOnly: boolean, revision: number, status: string | null) {
  const key = userId ? `${userId}:${reportId}:${reviewOnly}` : '';
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: '', data: null, checkedAt: 0, failed: false });
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const sequence = ++request.current;
    if (!key) return false;
    try {
      let query = createClient().from('cleanup_attempts').select('*').eq('report_id', reportId);
      query = reviewOnly
        ? query.eq('reporter_id', userId!).eq('status', 'completion_submitted').order('latest_submitted_at', { ascending: false })
        : query.in('status', ['claimed', 'changes_requested', 'completion_submitted']).order('claimed_at', { ascending: false });
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      if (sequence !== request.current) return false;
      setSnapshot({ key, data, checkedAt: Date.now(), failed: false });
      return true;
    } catch {
      if (sequence === request.current) setSnapshot(previous => ({
        key, data: previous.key === key ? previous.data : null,
        checkedAt: previous.key === key ? previous.checkedAt : 0, failed: true,
      }));
      return false;
    }
  }, [key, reportId, reviewOnly, userId]);

  useEffect(() => {
    let active = true;
    const requests = request;
    void Promise.resolve().then(() => { if (active) void refresh(); });
    return () => { active = false; requests.current++; };
  }, [refresh, revision, status]);

  const clear = useCallback(() => {
    // An older poll must not resurrect a task after an acknowledged mutation.
    request.current++;
    setSnapshot({ key, data: null, checkedAt: Date.now(), failed: false });
  }, [key]);
  const current = snapshot.key === key;
  return {
    attempt: current ? snapshot.data : null,
    loading: Boolean(key && !current),
    failed: current && snapshot.failed,
    checkedAt: current ? snapshot.checkedAt : 0,
    refresh, clear,
  };
}
