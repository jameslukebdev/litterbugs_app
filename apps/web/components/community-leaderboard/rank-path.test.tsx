// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
import { RankPathView } from './rank-path';

afterEach(cleanup);

describe('RankPathView', () => {
  it('shows the first point without opening its options on arrival', () => {
    const html = renderToStaticMarkup(<RankPathView events={[]} />);
    expect(html).toContain('Gnat');
    expect(html).toContain('1 point to Ladybug');
    expect(html).toContain('Your first point');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Ways to earn your next point');
  });

  it('toggles the ways to earn between the selected stone and the next row', () => {
    render(<RankPathView events={[]} />);
    const stone = screen.getByRole('button', { name: 'Point 1: ways to earn it' });
    const stop = stone.closest('li');
    expect(stop).toBeTruthy();
    fireEvent.click(stone);
    const panel = screen.getByRole('group', { name: 'Ways to earn your next point' });
    expect(stone.getAttribute('aria-expanded')).toBe('true');
    expect(stone.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.parentElement).toBe(stop);
    expect(panel.nextElementSibling).toBeNull();
    expect(stop?.nextElementSibling?.textContent).toContain('Ladybug');
    expect(within(panel).getAllByRole('link')).toHaveLength(3);
    fireEvent.click(stone);
    expect(stone.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('group', { name: 'Ways to earn your next point' })).toBeNull();
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
