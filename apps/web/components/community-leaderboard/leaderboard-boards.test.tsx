import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
import { LeaderboardBoards } from './leaderboard-boards';
import { daysLeftLabel, ordinal, rankFor } from './ranks';
import type { Boards, LeaderboardRow } from '@/lib/community-leaderboards';

const row = (place: number, name: string, score: number, rankPoints = 1): LeaderboardRow =>
  ({ place, profileId: `00000000-0000-4000-8000-00000000000${place}`, name, score, rankPoints, communityName: 'Boone', communityPath: '/communities/us/nc/boone' });
const empty = (): Boards => ({ clean: { month: [], all: [] }, report: { month: [], all: [] }, fund: { month: [], all: [] } });
const render = (boards: Boards, scope: React.ComponentProps<typeof LeaderboardBoards>['scope'] = { kind: 'community', slug: 'us-nc-boone', path: '/communities/us/nc/boone', shortName: 'Boone' }) =>
  renderToStaticMarkup(<LeaderboardBoards boards={boards} scope={scope} monthName="November" monthEnds="November 30" daysLeft={16} updatedAt="2026-11-15T12:00:00Z" />);

describe('leaderboard defaults', () => {
  it('opens on All time when this month has fewer than three people', () => {
    const boards = empty();
    boards.clean.month = [row(1, 'Maya R.', 2)];
    boards.clean.all = [row(1, 'Maya R.', 9), row(2, 'Dana W.', 6)];
    const html = render(boards);
    expect(html).toContain('All-time race');
    expect(html).toContain('Maya R.');
  });

  it('opens on the month when three or more people are racing', () => {
    const boards = empty();
    boards.clean.month = [row(1, 'Maya R.', 4), row(2, 'Dana W.', 3), row(3, 'Nico A.', 2)];
    boards.clean.all = boards.clean.month;
    const html = render(boards);
    expect(html).toContain('November race');
    expect(html).toContain('16 days left');
  });

  it('starts a new town on the first board with anyone on it', () => {
    const boards = empty();
    boards.report.all = [row(1, 'Ava L.', 3)];
    const html = render(boards);
    expect(html).toMatch(/aria-selected="true"[^>]*>.*?Reporters/);
  });

  it('gives the top three medals, links rows to profiles, and says when a board is empty', () => {
    const boards = empty();
    boards.fund.all = [row(1, 'Ruth H.', 6), row(2, 'Tom B.', 3), row(3, 'Priya S.', 2), row(4, 'Sam O.', 1)];
    const html = render(boards);
    expect(html.match(/data-medal="/g)).toHaveLength(3);
    expect(html).toContain('href="/members/00000000-0000-4000-8000-000000000001"');
    expect(html).toContain('6</b> cleanups funded');
    const quiet = render(empty());
    expect(quiet).toContain('No cleanups in Boone yet.');
  });

  it('shows each person’s town on the global board instead of their rank', () => {
    const boards = empty();
    boards.clean.all = [row(1, 'Maya R.', 9, 70)];
    const html = render(boards, { kind: 'global' });
    expect(html).toContain('<span>Boone</span>');
    expect(html).not.toContain('Caterpillar');
  });

  it('invites signed-out visitors to sign in and come back to the same board', () => {
    const boards = empty();
    boards.clean.all = [row(1, 'Maya R.', 9)];
    expect(render(boards)).toContain('href="/sign-in?next=%2Fcommunities%2Fus%2Fnc%2Fboone%3Fboard%3Dcleaners"');
  });
});

describe('rank and wording helpers', () => {
  it('matches the site’s rank ladder', () => {
    expect(rankFor(0).name).toBe('Gnat');
    expect(rankFor(12).name).toBe('Honeybee');
    expect(rankFor(149).name).toBe('Butterfly');
    expect(rankFor(500).name).toBe('Dragonfly');
  });

  it('writes places and countdowns naturally', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
    expect([0, 1, 16].map(daysLeftLabel)).toEqual(['Ends today', '1 day left', '16 days left']);
  });
});
