import Image from 'next/image';
import Link from 'next/link';
import { IoMapOutline } from 'react-icons/io5';
import { AVAILABLE_CLEANUPS_MAP_HREF } from '@/lib/home-map-link';
import { BOONE_PREVIEW, type MapPreviewPin } from '@/lib/map-preview';
import { MapPreviewPins } from './map-preview-pins';
import { MapPinBug } from './map-pin-bug';
import styles from './map-preview.module.css';

/**
 * A light preview of the map, the site's main tool: a self-hosted map picture with live report pins.
 * Not draggable or zoomable; the backdrop opens the full map, and each pin opens its report there.
 * `pins` is null while the live pins are still loading.
 */
export function MapPreview({ pins }: { pins: MapPreviewPin[] | null }) {
  const count = (kind: MapPreviewPin['kind']) => pins?.filter((pin) => pin.kind === kind).length ?? 0;
  // The count label doubles as the map key: each bug next to what it means and how many there are.
  const key = ([
    ['open', count('open'), 'need a cleanup', 'needs a cleanup'],
    ['busy', count('busy'), 'being cleaned', 'being cleaned'],
    ['done', count('done'), 'cleaned up', 'cleaned up'],
  ] as const).filter(([, n]) => n > 0);
  return (
    <section className={styles.preview} aria-labelledby="map-preview-title">
      <div className={styles.head}>
        <h2 id="map-preview-title">Find litter on the map</h2>
        <Link className={styles.open} href={AVAILABLE_CLEANUPS_MAP_HREF}><IoMapOutline aria-hidden />Open map</Link>
      </div>
      <div className={styles.frame}>
        <div className={styles.stage}>
          <Link className={styles.backdrop} href={AVAILABLE_CLEANUPS_MAP_HREF} aria-label="Open the litter map" tabIndex={-1}>
            <Image src={BOONE_PREVIEW.image} alt="" fill sizes="(max-width: 1244px) 100vw, 1180px" />
          </Link>
        </div>
        {pins && <MapPreviewPins pins={pins} />}
        {key.length > 0 && (
          <ul className={styles.key} aria-label="Map key">
            {key.map(([kind, n, many, one]) => (
              <li key={kind}><MapPinBug kind={kind} size={18} /><span><b>{n}</b> {n === 1 ? one : many}</span></li>
            ))}
          </ul>
        )}
        <a className={styles.credit} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
    </section>
  );
}
