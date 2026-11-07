'use client';
/* eslint-disable @next/next/no-img-element -- card thumbnails use the report photo route directly, like PublicPhoto. */
import Link from 'next/link';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { IoChevronForward, IoClose } from 'react-icons/io5';
import { MapPinBug } from './map-pin-bug';
import { AVAILABLE_CLEANUPS_MAP_HREF } from '@/lib/home-map-link';
import type { MapPreviewPin } from '@/lib/map-preview';
import styles from './map-preview.module.css';

type Group = { x: number; y: number; pins: MapPreviewPin[] };

/** Pins that would overlap become one numbered bubble, like the map page's groups. */
function groupPins(pins: MapPreviewPin[]): Group[] {
  const groups: Group[] = [];
  // Paid spots first, then volunteer spots, then cleanups, so a group's first rows show what pays.
  const rank = (pin: MapPreviewPin) => (pin.kind === 'done' ? 3 : pin.kind === 'busy' ? 2 : pin.funded ? 0 : 1);
  const ordered = [...pins].sort((a, b) => rank(a) - rank(b));
  for (const pin of ordered) {
    const near = groups.find((group) => Math.abs(group.x - pin.x) < 5.5 && Math.abs(group.y - pin.y) < 8);
    if (near) {
      near.pins.push(pin);
      near.x = near.pins.reduce((sum, item) => sum + item.x, 0) / near.pins.length;
      near.y = near.pins.reduce((sum, item) => sum + item.y, 0) / near.pins.length;
    } else groups.push({ x: pin.x, y: pin.y, pins: [pin] });
  }
  return groups;
}

const tone = (pin: MapPreviewPin) => (pin.kind === 'open' ? (pin.funded ? 'paid' : 'volunteer') : pin.kind);
const rowChip = (pin: MapPreviewPin) => (pin.kind === 'done' ? 'Cleaned up' : pin.kind === 'busy' ? 'In progress' : pin.funded ? pin.label : 'Volunteer');
const reportHref = (pin: MapPreviewPin) => `/map?report=${encodeURIComponent(pin.id)}`;
/** Opens the map zoomed into the group's spot (the map page reads #map=lat,lng,zoom). */
const groupHref = (group: Group) => {
  const lat = group.pins.reduce((sum, pin) => sum + pin.lat, 0) / group.pins.length;
  const lng = group.pins.reduce((sum, pin) => sum + pin.lng, 0) / group.pins.length;
  return `${AVAILABLE_CLEANUPS_MAP_HREF}#map=${lat.toFixed(3)},${lng.toFixed(3)},16.0`;
};
const isTouch = (event: React.MouseEvent, last: string) => {
  const type = (event.nativeEvent as PointerEvent).pointerType || last;
  return type === 'touch' || type === 'pen';
};

/** A group card lists this many reports; the rest are counted and open on the map. */
const GROUP_ROWS = 3;

/** Rows for a group: each report links to itself on the map; any extra count opens the map zoomed into the group. */
function GroupList({ group }: { group: Group }) {
  return (
    <>
      <span className={styles.groupTitle}>{group.pins.length} spots close together</span>
      <ul className={styles.groupRows}>
        {group.pins.slice(0, GROUP_ROWS).map((pin) => (
          <li key={pin.id}>
            <Link href={reportHref(pin)} className={styles.groupRow}>
              <MapPinBug kind={pin.kind} size={20} />
              <span className={styles.rowTitle}>{pin.title}</span>
              <span className={styles.chip} data-tone={tone(pin)}>{rowChip(pin)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {group.pins.length > GROUP_ROWS && (
        <Link href={groupHref(group)} className={styles.groupMore}>
          {group.pins.length - GROUP_ROWS} more {group.pins.length - GROUP_ROWS === 1 ? 'spot' : 'spots'} here
          <IoChevronForward aria-hidden />
        </Link>
      )}
    </>
  );
}
const photoSrc = (url: string) => (url.startsWith('/reports/') ? `${url}?width=640` : url);

function PinCard({ pin, showPhoto }: { pin: MapPreviewPin; showPhoto: boolean }) {
  return (
    <>
      <span className={styles.thumb} aria-hidden="true">
        {showPhoto && pin.photo ? <img src={photoSrc(pin.photo)} alt="" loading="lazy" decoding="async" /> : <MapPinBug kind={pin.kind} size={24} />}
      </span>
      <span className={styles.cardText}>
        <strong>{pin.title}</strong>
        <span className={styles.chip} data-tone={tone(pin)}>{pin.detail}</span>
      </span>
    </>
  );
}

/**
 * Mouse: hovering a pin or group shows its card; a click opens that report (or zooms the map into the group).
 * Touch: the first tap shows the card in a panel along the bottom of the map; the second tap opens it.
 */
export function MapPreviewPins({ pins }: { pins: MapPreviewPin[] }) {
  const groups = useMemo(() => groupPins(pins), [pins]);
  const [selected, setSelected] = useState<string | null>(null);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  const pointer = useRef<string>('mouse');
  const activeGroup = groups.find((group) => group.pins.length > 1 && `group:${group.pins[0].id}` === selected) ?? null;
  const activePin = activeGroup ? null : pins.find((pin) => pin.id === selected) ?? null;
  const reveal = (id: string) => setSeen((current) => (current.has(id) ? current : new Set(current).add(id)));
  const track = {
    onPointerDown: (event: React.PointerEvent) => { pointer.current = event.pointerType; },
    onKeyDown: () => { pointer.current = 'keyboard'; },
  };

  return (
    <>
      <ul className={`${styles.stage} ${styles.pins}`} aria-label="Litter reports and recent cleanups on the map">
        {groups.map((group) => {
          const position = { '--pin-x': `${group.x}%`, '--pin-y': `${group.y}%` } as CSSProperties;
          const side = group.x < 16 ? 'start' : group.x > 84 ? 'end' : 'center';
          // Group lists are taller than a single card, so they open downward unless the group sits low on the map.
          const below = group.y < (group.pins.length > 1 ? 62 : 38) || undefined;
          if (group.pins.length > 1) {
            const key = `group:${group.pins[0].id}`;
            const lead = group.pins.some((pin) => pin.kind === 'open') ? 'open' : group.pins.some((pin) => pin.kind === 'busy') ? 'busy' : 'done';
            return (
              <li key={key} className={`${styles.pinSpot} ${styles.groupSpot}`} style={position} data-kind={lead}>
                <Link
                  href={groupHref(group)}
                  className={styles.group}
                  data-selected={selected === key || undefined}
                  aria-label={`${group.pins.length} spots close together. Zoom in on the map`}
                  {...track}
                  onClick={(event) => {
                    if (!isTouch(event, pointer.current) || selected === key) return;
                    event.preventDefault();
                    setSelected(key);
                  }}
                >
                  <MapPinBug kind={lead} size={18} />
                  <span>{group.pins.length}</span>
                </Link>
                <div className={`${styles.card} ${styles.groupCard}`} data-side={side} data-below={below}>
                  <GroupList group={group} />
                </div>
              </li>
            );
          }
          const pin = group.pins[0];
          return (
            <li key={pin.id} className={styles.pinSpot} style={position} data-kind={pin.kind}>
              <Link
                href={reportHref(pin)}
                className={styles.pin}
                data-kind={pin.kind}
                data-selected={pin.id === selected || undefined}
                aria-label={`${pin.title}. ${pin.detail}`}
                onPointerEnter={() => reveal(pin.id)}
                onFocus={() => reveal(pin.id)}
                {...track}
                onClick={(event) => {
                  if (!isTouch(event, pointer.current) || selected === pin.id) return;
                  event.preventDefault();
                  reveal(pin.id);
                  setSelected(pin.id);
                }}
              >
                <span className={styles.pill} aria-hidden="true">
                  <MapPinBug kind={pin.kind} size={20} />
                  {pin.funded && <span>{pin.label}</span>}
                </span>
                <span className={styles.card} data-side={side} data-below={below} aria-hidden="true">
                  <PinCard pin={pin} showPhoto={seen.has(pin.id)} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {(activePin || activeGroup) && (
        <div className={styles.panel} data-group={activeGroup ? true : undefined}>
          {activePin ? (
            <Link className={styles.panelMain} href={reportHref(activePin)} aria-label={`Open on map: ${activePin.title}. ${activePin.detail}`}>
              <PinCard pin={activePin} showPhoto />
              <span className={styles.panelGo} aria-hidden="true"><IoChevronForward /></span>
            </Link>
          ) : activeGroup && (
            <div className={styles.panelMain}><div className={styles.panelGroup}><GroupList group={activeGroup} /></div></div>
          )}
          <button type="button" className={styles.panelClose} aria-label="Close" onClick={() => setSelected(null)}><IoClose aria-hidden /></button>
        </div>
      )}
    </>
  );
}
