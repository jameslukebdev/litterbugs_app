'use client';
import { useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { readDiscoveryView } from '@/lib/discovery-memory';
import { PublicSiteHeader } from './public-site-header';

const subscribe = () => () => {};
const isPhone = () => window.matchMedia?.('(max-width: 760px)').matches ?? false;

/** Matches the map workspace rather than flashing a generic page card. */
export function MapLoading() {
  // The router's params already point at the destination while it loads; window.location lags a frame.
  const search = useSearchParams().toString();
  const phone = useSyncExternalStore(subscribe, isPhone, () => null);
  /** The view the map page will open in, so the placeholder never shows the wrong one. */
  // Report entry and sign-in always open over the map view.
  const mapOnly = ['/report', '/sign-in'].includes(usePathname());
  const explicit = new URLSearchParams(search).has('view');
  const view = mapOnly ? 'map' : explicit || phone !== null ? readDiscoveryView(search, phone ?? false) : null;
  // No explicit view during server render: keep the CSS default (map on phones, list on wider screens).
  const viewClass = view === null ? 'showing-reports discovery-default-view' : view === 'reports' ? 'showing-reports' : '';
  return <main className={`map-page website-experience ${viewClass} map-route-loading`} aria-busy="true">
    <PublicSiteHeader activePath="/map" compactMobile />
    <div className="discovery-toolbar" aria-hidden="true">
      <span className="map-loading-search" />
      <div className="map-loading-filters"><span /><span /><span /><span /></div>
    </div>
    <div className="map-workspace">
      <aside className="report-browser" aria-hidden="true"><div className="report-browser-header"><h1>Litter reports</h1></div><div className="report-browser-list"><div className="map-loading-report"><span className="account-skeleton" /><span className="account-skeleton account-skeleton-name" /><span className="account-skeleton account-skeleton-line" /></div></div></aside>
      <section className="map-stage" aria-label="Loading map"><div className="map-loading map-loading-cover" role="status"><span className="sr-only">Loading map…</span></div></section>
    </div>
  </main>;
}
