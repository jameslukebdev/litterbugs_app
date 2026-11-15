import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { matchTowns, nearestTown, NEAR_KM, TownFinder, type FinderTown } from './town-finder';

const town = (name: string, search: string, latitude: number | null, longitude: number | null): FinderTown =>
  ({ path: `/communities/us/nc/${name.toLowerCase().replace(/\s+/g, '-')}`, name, label: `${name}, NC`, place: 'North Carolina', detail: '1 cleanup this month', search, latitude, longitude });
const towns = [
  town('Boone', 'boone watauga county north carolina nc united states', 36.2168, -81.6746),
  town('Avery County', 'avery county north carolina nc united states', 36.07, -81.87),
  town('Greensboro', 'greensboro north carolina nc united states', 36.0726, -79.792),
  town('Chorrillos', 'chorrillos lima peru', null, null),
];

describe('town finder', () => {
  it('matches every typed word against the name, county and state, names first', () => {
    expect(matchTowns(towns, 'watauga').map(t => t.name)).toEqual(['Boone']);
    expect(matchTowns(towns, 'avery').map(t => t.name)).toEqual(['Avery County']);
    expect(matchTowns(towns, 'north carolina').map(t => t.name)).toEqual(['Boone', 'Avery County', 'Greensboro']);
    expect(matchTowns(towns, '  ')).toEqual([]);
    expect(matchTowns(towns, 'banner elk')).toEqual([]);
  });

  it('finds the nearest town centre and skips towns without one', () => {
    const banner = nearestTown(towns, 36.163, -81.871);
    expect(banner?.town.name).toBe('Avery County');
    expect(banner!.km).toBeLessThan(NEAR_KM);
    const lima = nearestTown(towns, -12.17, -77.02);
    expect(lima?.town.name).not.toBe('Chorrillos');
    expect(lima!.km).toBeGreaterThan(NEAR_KM);
    expect(nearestTown([], 0, 0)).toBeNull();
  });

  it('shows the search box, Near me and the signed-in person’s own towns', () => {
    const html = renderToStaticMarkup(<TownFinder towns={towns} yourTowns={[{ path: '/communities/us/nc/avery-county', label: 'Avery County, NC' }]} />);
    expect(html).toContain('Find your town');
    expect(html).toContain('placeholder="Town, city or county"');
    expect(html).toContain('aria-label="Find your town or county"');
    expect(html).toContain('Near me');
    expect(html).toContain('aria-label="Your towns"');
    expect(html).toContain('href="/communities/us/nc/avery-county"');
    expect(renderToStaticMarkup(<TownFinder towns={towns} yourTowns={[]} />)).not.toContain('Your towns');
  });
});
