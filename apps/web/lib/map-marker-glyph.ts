import type { MappableReport } from '@litterbugs/report-contract';
import { BUG_ART, prefersReducedMotion } from './bug-motion';

/**
 * Map pins in the site's bug style (same as the homepage map preview):
 * ladybug = needs a cleanup, caterpillar = being cleaned up, flower = cleaned up.
 * Only money gets visible text ("$5"); other pins keep their word for screen readers.
 */
export type PinKind = 'open' | 'busy' | 'done';

const BUGS: Record<PinKind, { src: string; width: number; height: number }> = {
  open: { src: '/brand/bugs/ladybug.png', width: 18, height: 20 },
  busy: { src: '/brand/ranks/caterpillar.svg', width: 22, height: 22 },
  done: { src: '/brand/bugs/flower.png', width: 17, height: 16 },
};

export function pinKind(state: string | null | undefined): PinKind {
  if (state === 'completed') return 'done';
  if (state === 'claimed' || state === 'completion_submitted' || state === 'changes_requested') return 'busy';
  return 'open';
}

/** Fills a marker or group glyph; only touches the DOM when what it shows has changed. */
export function renderPinGlyph(glyph: HTMLElement, kind: PinKind, text: string, visibleText: boolean) {
  const key = `${kind}|${text}|${visibleText}`;
  if (glyph.dataset.render === key) return;
  const firstRender = glyph.dataset.render === undefined;
  const previousKind = glyph.dataset.kind as PinKind | undefined;
  glyph.dataset.render = key;
  glyph.dataset.kind = kind;
  glyph.classList.toggle('map-pin-icon-only', !visibleText);
  const bug = document.createElement('img');
  const art = BUGS[kind];
  bug.src = art.src; bug.alt = ''; bug.width = art.width; bug.height = art.height; bug.draggable = false;
  bug.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = visibleText ? 'map-pin-text' : 'sr-only';
  label.textContent = text;
  // Keep any hover card that already lives inside the glyph.
  const card = glyph.querySelector(':scope > .map-pin-card');
  // A spot that was waiting for a cleanup (ladybug or caterpillar) and is now done blooms into its flower.
  if (!firstRender && previousKind && previousKind !== 'done' && kind === 'done' && !prefersReducedMotion()) bug.classList.add('bug-pin-bloom');
  glyph.replaceChildren(bug, label, ...(card ? [card] : []));
}

const postedLandings = new WeakSet<HTMLElement>();

/** Stagger the pins that just entered the viewport. */
export function landPin(glyph: HTMLElement, order: number) {
  if (postedLandings.delete(glyph) || glyph.classList.contains('bug-pin-land') || prefersReducedMotion()) return;
  glyph.style.animationDelay = `${Math.min(order, 8) * 60}ms`;
  glyph.classList.add('bug-pin-land');
  const finish = (event: AnimationEvent) => {
    if (event.target !== glyph || event.animationName !== 'bug-land') return;
    glyph.classList.remove('bug-pin-land');
    glyph.style.animationDelay = '';
    glyph.removeEventListener('animationend', finish);
    glyph.removeEventListener('animationcancel', finish);
  };
  glyph.addEventListener('animationend', finish);
  glyph.addEventListener('animationcancel', finish);
}

/** The dragonfly flies in and drops a just-posted report's pin, with a small ripple where it lands. */
export function celebratePostedPin(glyph: HTMLElement) {
  if (prefersReducedMotion()) return;
  // When this pin rejoins the clusters, its dragonfly has already landed it.
  postedLandings.add(glyph);
  const dragonfly = document.createElement('img');
  dragonfly.src = BUG_ART.dragonfly; dragonfly.alt = ''; dragonfly.setAttribute('aria-hidden', 'true');
  dragonfly.className = 'bug-pin-dragonfly';
  const ripple = document.createElement('span');
  ripple.className = 'bug-pin-ripple'; ripple.setAttribute('aria-hidden', 'true');
  glyph.classList.remove('bug-pin-land');
  glyph.style.animationDelay = '';
  glyph.classList.add('bug-pin-posted');
  glyph.append(dragonfly, ripple);
  window.setTimeout(() => { dragonfly.remove(); ripple.remove(); glyph.classList.remove('bug-pin-posted'); }, 2200);
}

export function reportPinText(report: Pick<MappableReport, 'cleanup_state' | 'funded_amount_cents'>) {
  const kind = pinKind(report.cleanup_state);
  if (kind === 'done') return { kind, text: 'Done', visible: false };
  if (kind === 'busy') return { kind, text: 'Busy', visible: false };
  if (report.funded_amount_cents > 0) {
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(report.funded_amount_cents / 100);
    return { kind, text: amount, visible: true };
  }
  return { kind, text: 'Open', visible: false };
}

/**
 * Advanced Markers copy `title` into both aria-label (kept, for screen readers) and the native title
 * attribute, whose grey browser tooltip would sit on top of our hover card. Drop only the attribute.
 */
export function hideNativeTooltip(marker: HTMLElement, label: string) {
  queueMicrotask(() => {
    marker.removeAttribute('title');
    marker.setAttribute('aria-label', label);
  });
}

/* ---------- Hover cards (mouse and trackpad only; taps open the report panel) ---------- */

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

function chipFor(report: Pick<MappableReport, 'cleanup_state' | 'funded_amount_cents'>, short: boolean) {
  const kind = pinKind(report.cleanup_state);
  if (kind === 'done') return { tone: 'done', text: 'Cleaned up' };
  if (kind === 'busy') return { tone: 'busy', text: short ? 'In progress' : 'Being cleaned up' };
  if (report.funded_amount_cents > 0) return { tone: 'paid', text: short ? money(report.funded_amount_cents) : `Pays ${money(report.funded_amount_cents)} to clean up` };
  return { tone: 'volunteer', text: short ? 'Volunteer' : 'Volunteer cleanup' };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function bugImage(kind: PinKind) {
  const art = BUGS[kind];
  const bug = document.createElement('img');
  bug.src = art.src; bug.alt = ''; bug.width = art.width; bug.height = art.height; bug.draggable = false;
  bug.setAttribute('aria-hidden', 'true');
  return bug;
}

function cardOf(glyph: HTMLElement) {
  let card = glyph.querySelector<HTMLElement>(':scope > .map-pin-card');
  if (!card) {
    card = el('span', 'map-pin-card');
    card.setAttribute('aria-hidden', 'true');
    glyph.append(card);
  }
  return card;
}

/** Card for one report: photo (loaded on first hover), title, and one pastel chip. */
export function renderPinCard(glyph: HTMLElement, report: MappableReport, photoSrc: string | null) {
  const chip = chipFor(report, false);
  const key = `${report.title}|${chip.text}|${photoSrc ?? ''}`;
  const card = cardOf(glyph);
  if (card.dataset.render === key) return;
  card.dataset.render = key;
  const thumb = el('span', 'map-pin-thumb');
  if (photoSrc) {
    const photo = document.createElement('img');
    photo.alt = ''; photo.decoding = 'async'; photo.dataset.src = photoSrc;
    photo.addEventListener('error', () => photo.replaceWith(bugImage(pinKind(report.cleanup_state))), { once: true });
    thumb.append(photo);
  } else thumb.append(bugImage(pinKind(report.cleanup_state)));
  const text = el('span', 'map-pin-card-text');
  const chipNode = el('span', 'map-pin-chip', chip.text);
  chipNode.dataset.tone = chip.tone;
  text.append(el('strong', '', report.title || 'Litter report'), chipNode);
  card.replaceChildren(thumb, text);
}

const GROUP_ROWS = 3;
const rank = (report: MappableReport) => {
  const kind = pinKind(report.cleanup_state);
  return kind === 'done' ? 3 : kind === 'busy' ? 2 : report.funded_amount_cents > 0 ? 0 : 1;
};

/** Card for a group: up to three spots (paid first) and how many more are inside. */
export function renderGroupCard(glyph: HTMLElement, members: MappableReport[]) {
  const ordered = [...members].sort((a, b) => rank(a) - rank(b));
  const key = ordered.map(report => `${report.id}:${report.cleanup_state}:${report.funded_amount_cents}`).join('|');
  const card = cardOf(glyph);
  card.classList.add('map-group-card');
  if (card.dataset.render === key) return;
  card.dataset.render = key;
  const rows = el('span', 'map-group-rows');
  for (const report of ordered.slice(0, GROUP_ROWS)) {
    const chip = chipFor(report, true);
    const row = el('span', 'map-group-row');
    const chipNode = el('span', 'map-pin-chip', chip.text);
    chipNode.dataset.tone = chip.tone;
    row.append(bugImage(pinKind(report.cleanup_state)), el('span', 'map-group-row-title', report.title || 'Litter report'), chipNode);
    rows.append(row);
  }
  const extra = ordered.length - GROUP_ROWS;
  card.replaceChildren(el('span', 'map-group-title', `${ordered.length} spots close together`), rows, ...(extra > 0 ? [el('span', 'map-group-more', `${extra} more ${extra === 1 ? 'spot' : 'spots'} here`)] : []));
}

/** Loads the card photo on first hover and keeps the card inside the map's edges. */
export function prepareCard(glyph: HTMLElement) {
  const card = glyph.querySelector<HTMLElement>(':scope > .map-pin-card');
  if (!card) return;
  const photo = card.querySelector<HTMLImageElement>('img[data-src]');
  if (photo && !photo.src) photo.src = photo.dataset.src!;
  const frame = glyph.closest('.google-map')?.getBoundingClientRect();
  const pin = glyph.getBoundingClientRect();
  if (!frame) return;
  const roomAbove = pin.top - frame.top;
  card.toggleAttribute('data-below', roomAbove < (card.classList.contains('map-group-card') ? 230 : 120));
  const middle = pin.left + pin.width / 2;
  card.dataset.side = middle - frame.left < 170 ? 'start' : frame.right - middle < 170 ? 'end' : 'center';
}
