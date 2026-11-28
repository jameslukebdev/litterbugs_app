import { Website } from '@/components/public-website';
import { LeaderboardSkeleton } from '@/components/community-leaderboard/leaderboard-boards';

export default function Loading() {
  return <Website activePath="/communities" infoPage={false}><LeaderboardSkeleton /></Website>;
}
