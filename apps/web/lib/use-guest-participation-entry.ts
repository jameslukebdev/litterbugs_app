'use client';

import { useEffect, useRef } from 'react';
import { trackParticipation } from '@/lib/website-analytics';

/** A Fund/Clean link already expresses intent; do not ask for the same tap again. */
export function useGuestParticipationEntry({ action, reportId, autoOpen, userId, available, onRequireSignIn }: {
  action: 'fund' | 'clean';
  reportId: string;
  autoOpen: boolean;
  userId: string | null;
  available: boolean;
  onRequireSignIn?: () => void;
}) {
  const prompted = useRef<string | null>(null);
  useEffect(() => {
    if (!autoOpen) { prompted.current = null; return; }
    const key = `${action}:${reportId}`;
    if (userId || !available || !onRequireSignIn || prompted.current === key) return;
    prompted.current = key;
    trackParticipation(action, 'action_tapped');
    onRequireSignIn();
  }, [action, reportId, autoOpen, userId, available, onRequireSignIn]);
  // Manual taps also put intent in the URL. Do not prompt/track a second time
  // when that URL update comes back through autoOpen.
  return () => { prompted.current = `${action}:${reportId}`; };
}
