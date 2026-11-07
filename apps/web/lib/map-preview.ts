import 'server-only';
import { createPublicClient } from './supabase/public';
import { reportDiscoveryWindow } from './report-visibility';
import { loadPublicReportShare } from './public-report-share';
import { BOONE_PREVIEW, BOONE_MAP_BOUNDS } from './map-preview-frame';
export { BOONE_PREVIEW } from './map-preview-frame';

/**
 * The homepage map preview is a one-time OpenStreetMap snapshot (public/map-preview/boone.webp),
 * so pins are placed with the same Web Mercator maths the snapshot was cut with.
 * Frame: zoom 14, world-pixel origin (1145002, 1643342), 1600 × 1100 px. Wide screens show the middle band;
 * phones show more of the height. Pins only come from the middle 640 px band, which every screen shows.
 */

/** Recent cleanups stay on the preview this long, so finished spots don't crowd out open ones. */
const CLEANUP_WINDOW_DAYS = 90;

export type MapPreviewPin = {
  id: string;
  /** open = needs a cleanup, busy = someone is cleaning it, done = cleaned up recently. */
  kind: 'open' | 'busy' | 'done';
  title: string;
  /** Short pin text, matching the map page: "$5", "Open" or "Done". */
  label: string;
  /** Card chip: "Pays $5 to clean up", "Volunteer cleanup", "Being cleaned up" or "Cleaned up" (same as the map page). */
  detail: string;
  funded: boolean;
  photo: string | null;
  /** Rounded (~100 m) coordinates, used to open the map zoomed into a group of pins. */
  lat: number;
  lng: number;
  /** Percent position inside the snapshot frame. */
  x: number;
  y: number;
};

const worldX = (lng: number, zoom: number) => ((lng + 180) / 360) * 256 * 2 ** zoom;
const worldY = (lat: number, zoom: number) => {
  const sin = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 256 * 2 ** zoom;
};
const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

/**
 * Open reports and recent cleanups inside the Boone snapshot.
 * Coordinates are rounded (~100 m) before placing pins; the exact spot stays on the map page.
 */
export async function loadBooneMapPreview(): Promise<MapPreviewPin[]> {
  const f = BOONE_PREVIEW;
  const bounds = BOONE_MAP_BOUNDS;
  const client = createPublicClient();
  const base = () =>
    client
      .from('reports')
      .select('id,latitude,longitude')
      .eq('is_published', true)
      .eq('is_sample', false)
      .is('cancelled_at', null)
      .is('expired_at', null)
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
      .order('created_at', { ascending: false });
  try {
    const [open, busy, done] = await Promise.all([
      base().eq('cleanup_state', 'available').or(reportDiscoveryWindow()).limit(16),
      base().in('cleanup_state', ['claimed', 'completion_submitted', 'changes_requested']).limit(10),
      base().eq('cleanup_state', 'completed').limit(30),
    ]);
    const rows = [...(open.data ?? []), ...(busy.data ?? []), ...(done.data ?? [])];
    const cutoff = Date.now() - CLEANUP_WINDOW_DAYS * 86_400_000;
    const pins = await Promise.all(
      rows.map(async (row): Promise<MapPreviewPin | null> => {
        if (row.latitude == null || row.longitude == null) return null;
        const report = await loadPublicReportShare(row.id, 'linked');
        if (!report) return null;
        const lat = Math.round(row.latitude * 1000) / 1000;
        const lng = Math.round(row.longitude * 1000) / 1000;
        const place = { lat, lng, x: ((worldX(lng, f.zoom) - f.left) / f.width) * 100, y: ((worldY(lat, f.zoom) - f.top) / f.height) * 100 };
        if (report.state === 'available') {
          const cents = report.rewardCents ?? 0;
          return {
            id: report.id, kind: 'open', title: report.title, funded: cents > 0,
            label: cents > 0 ? money(cents) : 'Open',
            detail: cents > 0 ? `Pays ${money(cents)} to clean up` : 'Volunteer cleanup',
            photo: report.beforePhotoUrl, ...place,
          };
        }
        if (report.state === 'in_progress') {
          return {
            id: report.id, kind: 'busy', title: report.title, funded: false,
            label: 'Busy', detail: 'Being cleaned up',
            photo: report.beforePhotoUrl, ...place,
          };
        }
        if (report.state === 'completed' && report.completionDate && Date.parse(report.completionDate) >= cutoff) {
          return {
            id: report.id, kind: 'done', title: report.title, funded: false,
            label: 'Done', detail: 'Cleaned up',
            photo: report.afterPhotoUrl ?? report.beforePhotoUrl, ...place,
          };
        }
        return null;
      }),
    );
    return pins.filter((pin): pin is MapPreviewPin => pin !== null);
  } catch {
    return [];
  }
}
