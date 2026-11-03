import { PublicSiteHeader } from './public-site-header';

/** Matches the map workspace rather than flashing a generic page card. */
export function MapLoading() {
  return <main className="map-page website-experience showing-reports discovery-default-view map-route-loading" aria-busy="true">
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
