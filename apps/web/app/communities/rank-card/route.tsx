/* eslint-disable @next/next/no-img-element -- images inside a generated share card, not page content. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { BOARD_COPY, ordinal, rankFor } from '@/components/community-leaderboard/ranks';
import { BOARDS, communityLabel, loadBoards, loadCommunityDirectory, monthInfo, type Board, type Period } from '@/lib/community-leaderboards';
import { loadSocialCardFonts } from '@/lib/social-card-fonts';
import { loadSocialCardLogo } from '@/lib/social-card-logo';

export const runtime = 'nodejs';

/** Same board colours as the page: Clean = lilac, Report = blue, Fund = yellow. */
const TINT: Record<Board, { fill: string; edge: string; ink: string }> = {
  clean: { fill: '#f7effc', edge: '#cfa2e5', ink: '#60237e' },
  report: { fill: '#eef4ff', edge: '#9bbbf3', ink: '#234485' },
  fund: { fill: '#fff7d6', edge: '#d9ac19', ink: '#493a10' },
};

const bugCache = new Map<string, Promise<string>>();
function bugData(file: string) {
  if (!bugCache.has(file)) {
    bugCache.set(file, readFile(path.join(process.cwd(), 'public', file))
      .then(data => `data:image/${file.endsWith('.svg') ? 'svg+xml' : 'png'};base64,${data.toString('base64')}`));
  }
  return bugCache.get(file)!;
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });

/**
 * A person's place on a board as a 1200 × 630 image, for Share my rank. Built only from what the public
 * board already shows (short name, place, score), so it reveals nothing new.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const board = query.get('board') as Board;
  const period = (query.get('period') === 'all' ? 'all' : 'month') as Period;
  const profile = query.get('profile') ?? '';
  const slug = query.get('community');
  if (!BOARDS.includes(board) || !/^[0-9a-f-]{36}$/.test(profile) || (slug && !/^[a-z0-9-]{1,120}$/.test(slug))) return notFound();

  const community = slug ? (await loadCommunityDirectory()).communities.find(item => item.slug === slug) ?? null : null;
  if (slug && !community) return notFound();
  const rows = (await loadBoards(community?.slug ?? null))[board][period];
  const row = rows.find(item => item.profileId === profile);
  if (!row) return notFound();

  const copy = BOARD_COPY[board];
  const tint = TINT[board];
  const where = community ? `in ${community.name}` : 'on Litterbugs';
  const month = monthInfo(community?.timeZone ?? 'America/New_York').monthName;
  const race = period === 'month' ? `${month} ${copy.tab.toLowerCase()} race` : `All-time ${copy.tab.toLowerCase()}`;
  const [logo, bug, fonts] = await Promise.all([loadSocialCardLogo(), bugData(rankFor(row.rankPoints).artwork), loadSocialCardFonts()]);
  const site = community ? `litterbugs.app${community.path}` : 'litterbugs.app/communities';

  const image = new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: tint.fill, borderBottom: `14px solid ${tint.edge}`, padding: '48px 64px 40px', fontFamily: 'Inter', color: '#292932', position: 'relative' }}>
      <img src={logo} width={176} height={120} alt="" style={{ position: 'absolute', left: 52, top: 40, objectFit: 'contain' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 168, height: 168, borderRadius: 999, background: '#ffffff', border: `8px solid ${tint.edge}` }}>
        <img src={bug} width={104} height={104} alt="" style={{ objectFit: 'contain' }} />
      </div>
      <div style={{ display: 'flex', marginTop: 28, fontSize: 92, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>{`${ordinal(row.place)} ${where}`}</div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 40, fontWeight: 700, color: tint.ink }}>{race}</div>
      <div style={{ display: 'flex', marginTop: 10, fontSize: 32, color: '#45434d' }}>{`${row.name} · ${row.score} ${row.score === 1 ? copy.one : copy.many}`}</div>
      <div style={{ display: 'flex', marginTop: 'auto', fontSize: 26, fontWeight: 700, color: '#4438bb' }}>{site}</div>
    </div>,
    { width: 1200, height: 630, fonts },
  );

  const label = community ? communityLabel(community) : 'Litterbugs';
  return new Response(await image.arrayBuffer(), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'image/png',
      'Content-Disposition': `${query.get('download') ? 'attachment' : 'inline'}; filename="litterbugs-rank-${encodeURIComponent(label.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}.png"`,
    },
  });
}
