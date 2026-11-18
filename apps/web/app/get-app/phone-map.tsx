import Image from 'next/image';
import { IoListOutline, IoMap, IoPersonOutline } from 'react-icons/io5';
import { BUG_ART } from '@/lib/bug-motion';
import styles from './get-app.module.css';

const pinArt = {
  open: BUG_ART.ladybug,
  paid: BUG_ART.ladybug,
  busy: BUG_ART.caterpillar,
  done: BUG_ART.flower,
} as const;

// Illustrative positions and rewards for the download page.
const pins = [
  { kind: 'open', x: 54, y: 28 },
  { kind: 'paid', x: 36, y: 36, reward: '$15' },
  { kind: 'busy', x: 77, y: 41 },
  { kind: 'done', x: 18, y: 49 },
  { kind: 'paid', x: 32, y: 59, reward: '$25' },
  { kind: 'busy', x: 60, y: 64 },
  { kind: 'open', x: 59, y: 47 },
] as const;

// The base capture already includes one open and five completed reports.
const mapKey = [
  { kind: 'open', count: 5, label: 'need a cleanup' },
  { kind: 'busy', count: 2, label: 'being cleaned' },
  { kind: 'done', count: 6, label: 'cleaned up' },
] as const;

export function PhoneMap() {
  return (
    <div className={styles.scene}>
      <Image className={styles.lightning} src={BUG_ART.lightning} alt="" width={85} height={85} unoptimized />
      <div className={styles.phone} role="img" aria-label="Illustrative Litterbugs map showing paid cleanup spots, open reports, cleanups in progress, and completed cleanups">
        <div className={styles.screen} aria-hidden="true">
          <Image className={styles.map} src="/get-app/illustrative-map.webp" alt="" width={720} height={1361} sizes="(max-width: 760px) 180px, 220px" preload />
          <div className={styles.mapKey}>
            {mapKey.map(({ kind, count, label }) => (
              <span key={kind}><Image src={pinArt[kind]} alt="" width={14} height={14} unoptimized />{count} {label}</span>
            ))}
          </div>
          {pins.map(pin => (
            <span key={pin.x + ':' + pin.y} className={styles.pin} data-kind={pin.kind} style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
              <Image src={pinArt[pin.kind]} alt="" width={14} height={14} unoptimized />
              {'reward' in pin && pin.reward}
            </span>
          ))}
          <div className={styles.phoneTabs}>
            <span><IoListOutline />Reports</span>
            <span className={styles.selectedTab}><IoMap />Map</span>
            <span><IoPersonOutline />Profile</span>
          </div>
        </div>
      </div>
      <Image className={styles.ladybug} src="/brand/ranks/ladybug.svg" alt="" width={125} height={125} unoptimized />
      <Image className={styles.bee} src={BUG_ART.bee} alt="" width={101} height={97} />
      <Image className={styles.flower} src={BUG_ART.flower} alt="" width={65} height={63} />
    </div>
  );
}
