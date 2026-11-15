/* eslint-disable @next/next/no-img-element -- the map's own bug pins. */
import Image from 'next/image';
import { ResponsiveLink as Link } from '@/components/responsive-link';
import { loadBooneMapPreview } from '@/lib/map-preview';
import styles from './leaderboard.module.css';

const PIN_BUG = { open: '/brand/bugs/ladybug.png', busy: '/brand/ranks/caterpillar.svg', done: '/brand/bugs/flower.png' } as const;

/**
 * The town's map beside its board, using the homepage's self-hosted snapshot and live pins.
 * Only Boone has a snapshot so far; other towns show no map rather than an empty frame.
 */
export async function TownMap({ slug, latitude, longitude, label }: { slug: string; latitude: number | null; longitude: number | null; label: string }) {
  if (slug !== 'us-nc-boone') return null;
  let pins: Awaited<ReturnType<typeof loadBooneMapPreview>> = [];
  try { pins = await loadBooneMapPreview(); } catch { pins = []; }
  const href = latitude !== null && longitude !== null ? `/map?view=map&browse=1&lat=${latitude}&lng=${longitude}&zoom=12` : '/map';
  return <Link className={styles.map} href={href} aria-label={`Open the map around ${label}`} style={{ aspectRatio: '16 / 11' }}>
    <Image className={styles.mapImage} src="/map-preview/boone.webp" alt="" fill sizes="340px" />
    {pins.map(pin => <span key={pin.id} className={styles.pin} style={{ left: `${pin.x}%`, top: `${pin.y}%` }} aria-hidden="true">
      <img src={PIN_BUG[pin.kind]} alt="" />{pin.funded && <b>{pin.label}</b>}
    </span>)}
  </Link>;
}
