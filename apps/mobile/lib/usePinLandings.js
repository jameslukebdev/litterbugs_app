import { useCallback, useEffect, useRef, useState } from 'react';

// The website's pin arrival for the app map (apps/web lib/report-clusters.ts): whenever the map
// settles, every pin or group that has newly come into view lands, 60ms apart.
//
// On iPhone a map pin must never change after it is put on the map: any update to a pin (even
// its opacity) makes MapKit lose its place and draw it in the wrong spot until the map moves.
// So a pin that is about to land is first put on the map as an invisible placeholder; a
// stand-in (PinLanding) lands above the map at the same spot; then the placeholder is replaced
// by a brand-new, fully visible pin. Pins are only ever added or removed, never changed.
//
// Keys: a report pin uses its report id; a group uses the ids of the reports inside it, so a
// group that keeps the same reports while zooming does not land again (as on the website).

const STAGGER_MS = 60;
const MAX_STAGGER = 8;
const HANDOVER_MS = 140; // the stand-in stays until the real pin has surely been drawn under it
const SETTLE_MS = 16; // one frame: let the clustering redraw after the map settles before looking

// Whether two map views are the same. Android's extra "moving" report after the map stops
// carries exactly the settled view, while even the slowest real drag moves at once, so this
// only allows for rounding (a hundredth of a percent of the view).
function sameView(a, b) {
  if (!a || !b) return false;
  const near = (x, y, span) => Math.abs(x - y) <= Math.abs(span) * 0.0001;
  return near(a.latitude, b.latitude, a.latitudeDelta) && near(a.longitude, b.longitude, a.longitudeDelta)
    && near(a.latitudeDelta, b.latitudeDelta, a.latitudeDelta) && near(a.longitudeDelta, b.longitudeDelta, a.longitudeDelta);
}

function inRegion(region, coordinate) {
  if (!region || !coordinate) return false;
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return Math.abs(coordinate.latitude - region.latitude) <= halfLat
    && Math.abs(coordinate.longitude - region.longitude) <= halfLng;
}

// `inPlace` (Android): the real pin plays its own landing (components/AndroidStillMarker.jsx)
// instead of a stand-in above the map. Which pins land, and when, is decided exactly as on
// iPhone; each landing pin is just handed a `drop` token to play.
export default function usePinLandings({ enabled, mapRef, region, hidden, postedPinId, handoverMs = HANDOVER_MS, inPlace = false }) {
  const [shown, setShown] = useState(() => new Set());
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const [ghosts, setGhosts] = useState([]);
  // How many stand-ins are on screen, including ones handing over to their real pin.
  const ghostCount = useRef(0);
  ghostCount.current = ghosts.length;
  const [onMap, setOnMap] = useState(() => new Set()); // without landings: the pins on the map
  const [drops, setDrops] = useState(() => new Map()); // inPlace: key -> { token, order }
  const dropToken = useRef(0);
  const pins = useRef(new Map()); // key -> { coordinate, kind, text, mounts }
  const visible = useRef(new Set()); // keys that were in view when the map last settled
  const landing = useRef(new Set()); // keys hidden while their stand-in lands
  const moving = useRef(false);
  const generation = useRef(0);
  const timer = useRef(null);
  const movingFallback = useRef(null);
  // The map's own settled view, taken straight from the map so landing never waits for the
  // screen to catch up; a new view from the screen (a search, a tap on a group) replaces it.
  const regionRef = useRef(region);
  const regionProp = useRef(region);
  if (regionProp.current !== region) { regionProp.current = region; regionRef.current = region; }
  const hiddenRef = useRef(hidden);
  const postedRef = useRef(postedPinId);
  hiddenRef.current = hidden;
  postedRef.current = postedPinId;

  const reveal = useCallback((keys) => {
    if (!keys.length) return;
    setShown((current) => {
      if (keys.every(key => current.has(key))) return current;
      const next = new Set(current);
      keys.forEach(key => next.add(key));
      return next;
    });
  }, []);

  // The map started moving: anything mid-landing would drift away from its spot, so finish now.
  const finishAll = useCallback(() => {
    generation.current += 1;
    const keys = [...landing.current];
    landing.current.clear();
    reveal(keys);
    setGhosts(current => (current.length ? [] : current));
  }, [reveal]);

  const land = useCallback(async () => {
    timer.current = null;
    if (!enabled || moving.current || hiddenRef.current) return;
    const currentRegion = regionRef.current;
    const nowVisible = new Set();
    const toLand = [];
    const offscreen = [];
    for (const [key, pin] of pins.current) {
      if (!inRegion(currentRegion, pin.coordinate)) { offscreen.push(key); continue; }
      nowVisible.add(key);
      if (!visible.current.has(key) && !landing.current.has(key)) toLand.push(key);
    }
    visible.current = nowVisible;
    reveal(offscreen);
    if (!toLand.length) return;

    if (inPlace) {
      // Only pins that are not showing yet land. A pin already showing (one that stayed on the
      // map just off screen and was swiped back into view) stays put instead of vanishing and
      // dropping in again.
      const waiting = toLand.filter(key => !shownRef.current.has(key));
      if (!waiting.length) return;
      toLand.length = 0;
      toLand.push(...waiting);
      // The real pins are already on the map, invisible until now: each plays its own landing.
      dropToken.current += 1;
      const token = dropToken.current;
      setDrops((current) => {
        const next = new Map(current);
        toLand.forEach((key, index) => next.set(key, { token, order: Math.min(index, MAX_STAGGER) }));
        return next;
      });
      reveal(toLand);
      return;
    }

    // Hide the pins that are about to land (their real pin becomes an invisible placeholder).
    toLand.forEach(key => landing.current.add(key));
    setShown((current) => {
      const next = new Set(current);
      toLand.forEach(key => next.delete(key));
      return next;
    });
    const run = generation.current;
    const points = await Promise.all(toLand.map(async (key) => {
      try { return await mapRef.current?.pointForCoordinate?.(pins.current.get(key)?.coordinate); } catch { return null; }
    }));
    if (run !== generation.current) return;
    const added = [];
    const failed = [];
    toLand.forEach((key, index) => {
      const point = points[index];
      const pin = pins.current.get(key);
      if (!pin || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) { failed.push(key); return; }
      added.push({ key, x: point.x, y: point.y, kind: pin.kind, text: pin.text, order: Math.min(added.length, MAX_STAGGER), posted: key === postedRef.current });
    });
    failed.forEach(key => landing.current.delete(key));
    reveal(failed);
    if (added.length) setGhosts(current => [...current.filter(ghost => !added.some(next => next.key === ghost.key)), ...added]);
  }, [enabled, inPlace, mapRef, reveal]);

  const schedule = useCallback(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(land, SETTLE_MS);
  }, [enabled, land]);

  // A pin (visible or placeholder) has been put on the map.
  const track = useCallback((key, info) => {
    const existing = pins.current.get(key);
    pins.current.set(key, { ...info, mounts: (existing?.mounts ?? 0) + 1 });
    if (!enabled) setOnMap(current => (current.has(key) ? current : new Set(current).add(key)));
    schedule();
  }, [enabled, schedule]);

  // A pin has been taken off the map. Swapping a placeholder for the real pin unmounts one and
  // mounts the other in the same update, so only forget the key if nothing is back a moment later.
  const untrack = useCallback((key) => {
    const pin = pins.current.get(key);
    if (!pin) return;
    pin.mounts -= 1;
    setTimeout(() => {
      const current = pins.current.get(key);
      if (!current || current.mounts > 0) return;
      pins.current.delete(key);
      visible.current.delete(key);
      landing.current.delete(key);
      setOnMap((current) => {
        if (!current.has(key)) return current;
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      // Next time it appears it starts hidden and lands again.
      setShown((shownNow) => {
        if (!shownNow.has(key)) return shownNow;
        const next = new Set(shownNow);
        next.delete(key);
        return next;
      });
    }, 0);
  }, []);

  const regionChanging = useCallback((nextRegion) => {
    if (!enabled) return;
    // Android reports one more "moving" right after the map has stopped, with the view it
    // already settled on. That is not a move: treating it as one cancelled every landing
    // mid-air, so pins popped in instead of dropping.
    if (sameView(regionRef.current, nextRegion)) return;
    moving.current = true;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    // Stand-ins float above the map, so they cannot move with it: clear every one the moment
    // the map moves, including any still handing over to its real pin (on Android that
    // handover lasts over a second, and a stand-in left behind stayed fixed on the screen).
    if (landing.current.size || ghostCount.current) finishAll();
    // Never stay stuck if a settle event is missed.
    if (movingFallback.current) clearTimeout(movingFallback.current);
    movingFallback.current = setTimeout(() => { moving.current = false; schedule(); }, 1500);
  }, [enabled, finishAll, schedule]);

  // A finger touched the map: clear the floating stand-ins before anything moves, so none is
  // ever left behind on the screen while the map slides under it.
  const touched = useCallback(() => {
    if (enabled && (landing.current.size || ghostCount.current)) finishAll();
  }, [enabled, finishAll]);

  const regionSettled = useCallback((nextRegion) => {
    if (!enabled) return;
    if (nextRegion) regionRef.current = nextRegion;
    moving.current = false;
    if (movingFallback.current) { clearTimeout(movingFallback.current); movingFallback.current = null; }
    schedule();
  }, [enabled, schedule]);

  const ghostDone = useCallback((key) => {
    landing.current.delete(key);
    // Show the real pin and, in the same screen update, drop the stand-in's shadow, so the two
    // shadows never stack (that showed as a dark blink at the end of each landing).
    reveal([key]);
    setGhosts(current => current.map(ghost => (ghost.key === key ? { ...ghost, handover: true } : ghost)));
    setTimeout(() => setGhosts(current => current.filter(ghost => ghost.key !== key)), handoverMs);
  }, [reveal, handoverMs]);

  // The loading screen cleared, or the visible area changed: look for pins that need to land.
  useEffect(() => { if (!hidden) schedule(); }, [hidden, schedule]);
  useEffect(() => { schedule(); }, [region, schedule]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (movingFallback.current) clearTimeout(movingFallback.current);
  }, []);

  const isShown = useCallback((key) => !enabled || shown.has(key), [enabled, shown]);
  // Whether this pin stands on the map by itself and is fully shown (not in a group or landing).
  const isOnMap = useCallback((key) => (enabled ? shown.has(key) : onMap.has(key)), [enabled, shown, onMap]);

  // inPlace: the landing a pin should play, if any.
  const dropFor = useCallback((key) => drops.get(key), [drops]);

  return { isShown, isOnMap, track, untrack, ghosts, ghostDone, regionChanging, regionSettled, touched, dropFor };
}
