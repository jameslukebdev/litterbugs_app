import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import RankUpCelebration from './RankUpCelebration';
import { useProfile } from './lib/profile';
import { getRankForPoints } from './lib/ranking';
import {
  acknowledgeCurrentRank,
  loadPendingRankCelebration,
} from './lib/rankingService';
import { isPermanentUser } from './lib/reportAccess';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';

export default function RankCelebrationManager() {
  const { user } = useSession();
  const { profile, refreshProfile } = useProfile();
  const { reports } = useReports();
  const permanent = isPermanentUser(user);
  const [foregroundCheck, setForegroundCheck] = useState(0);
  const [localAcknowledgedPoints, setLocalAcknowledgedPoints] = useState(0);
  const [celebration, setCelebration] = useState(null);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState(null);

  const reportActivityKey = useMemo(() => (
    reports.map((report) => `${report.id}:${report.cleanup_state || 'available'}`).join('|')
  ), [reports]);

  useEffect(() => {
    setLocalAcknowledgedPoints(0);
    setCelebration(null);
    setError(null);
  }, [user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForegroundCheck((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;

    if (!permanent || !user?.id || !profile?.profile_completed_at) {
      setCelebration(null);
      return () => { active = false; };
    }

    const celebratedThroughPoints = Math.max(
      Number(profile.rank_celebrated_through_points) || 0,
      localAcknowledgedPoints,
    );

    loadPendingRankCelebration(user.id, celebratedThroughPoints)
      .then(({ ranking, pendingRank }) => {
        if (!active) return;
        if (!pendingRank) {
          setCelebration(null);
          return;
        }

        setCelebration({
          userId: user.id,
          previousRank: getRankForPoints(celebratedThroughPoints),
          newRank: pendingRank,
          points: ranking.points,
        });
        setError(null);
      })
      .catch((loadError) => {
        console.log('Rank celebration detection error:', loadError);
      });

    return () => { active = false; };
  }, [
    foregroundCheck,
    localAcknowledgedPoints,
    permanent,
    profile?.profile_completed_at,
    profile?.rank_celebrated_through_points,
    reportActivityKey,
    user?.id,
  ]);

  const continueAfterCelebration = useCallback(async () => {
    if (!celebration || continuing) return;

    try {
      setContinuing(true);
      setError(null);
      const acknowledgedPoints = await acknowledgeCurrentRank();
      setLocalAcknowledgedPoints(acknowledgedPoints);
      setCelebration(null);
      refreshProfile().catch((refreshError) => {
        console.log('Rank acknowledgment profile refresh error:', refreshError);
      });
    } catch (acknowledgmentError) {
      console.log('Rank acknowledgment error:', acknowledgmentError);
      setError('Your rank was earned, but we couldn’t save this celebration yet. Try again.');
    } finally {
      setContinuing(false);
    }
  }, [celebration, continuing, refreshProfile]);

  return (
    <RankUpCelebration
      visible={Boolean(celebration)}
      previousRank={celebration?.previousRank}
      newRank={celebration?.newRank}
      continuing={continuing}
      error={error}
      onContinue={continueAfterCelebration}
    />
  );
}
