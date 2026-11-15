import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
import { RankPathView } from './rank-path';

describe('RankPathView', () => {
  it('opens the ways to earn under a new member’s first stone', () => {
    const html = renderToStaticMarkup(<RankPathView events={[]} />);
    expect(html).toContain('Gnat');
    expect(html).toContain('1 point to Ladybug');
    expect(html).toContain('Your first point');
    expect(html).toContain('Report litter');
    expect(html).toContain('Clean a spot');
    expect(html).toContain('No points · counts on the Funders board');
  });

  it('shows each earned point with the bug of the route that earned it', () => {
    const html = renderToStaticMarkup(<RankPathView events={[
      { kind: 'report', points: 1, earnedAt: '2026-09-02T15:00:00Z' },
      { kind: 'report', points: 1, earnedAt: '2026-10-14T15:00:00Z' },
      { kind: 'clean', points: 3, earnedAt: '2026-11-04T15:00:00Z' },
    ]} />);
    expect(html).toContain('5 points · 7 points to Honeybee');
    expect(html).toContain('Report accepted');
    expect(html).toContain('Cleanup confirmed');
    expect(html.match(/data-state="clean"/g)).toHaveLength(3);
    expect(html).toContain('Next point');
    // Shown up to 3 empty stones past the next one (points 6–8); points 9–11 fold before Honeybee at 12.
    expect(html).toContain('+3 more stones');
  });

  it('shows the highest rank without a path', () => {
    const html = renderToStaticMarkup(<RankPathView events={Array.from({ length: 50 }, () => ({ kind: 'clean' as const, points: 3, earnedAt: '2026-11-01T15:00:00Z' }))} />);
    expect(html).toContain('Dragonfly');
    expect(html).toContain('Highest rank reached');
    expect(html).not.toContain('Next point');
  });
});
