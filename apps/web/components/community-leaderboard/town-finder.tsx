'use client';
import { useId, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiChevronRight, FiMapPin, FiNavigation, FiSearch } from 'react-icons/fi';
import styles from './leaderboard.module.css';

/** A public town as the finder needs it. Positions are the town's own (public) centre, never a person's. */
export type FinderTown = { path: string; name: string; label: string; place: string; detail: string; search: string; latitude: number | null; longitude: number | null };

const MAX_OPTIONS = 6;
/** "Near me" only offers a town within this distance. */
export const NEAR_KM = 80;

/** Known towns whose name, county, state or country contains every typed word; names that start with it first. */
export function matchTowns(towns: FinderTown[], query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const first = words.join(' ');
  return towns
    .filter(town => words.every(word => town.search.includes(word)))
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(first)) - Number(a.name.toLowerCase().startsWith(first)))
    .slice(0, MAX_OPTIONS);
}

/** The closest town centre to a point, with its distance in km, or null when there are no towns. */
export function nearestTown(towns: FinderTown[], latitude: number, longitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  let best: { town: FinderTown; km: number } | null = null;
  for (const town of towns) {
    if (town.latitude == null || town.longitude == null) continue;
    const x = radians(town.longitude - longitude) * Math.cos(radians((town.latitude + latitude) / 2));
    const km = 6371 * Math.hypot(x, radians(town.latitude - latitude));
    if (!best || km < best.km) best = { town, km };
  }
  return best;
}

type Result =
  | { kind: 'found'; path: string; label: string; place: string }
  | { kind: 'near'; town: FinderTown; km: number }
  | { kind: 'message'; text: string };

type SearchAnswer = { status: 'found'; place: string; community: { path: string; label: string } } | { status: 'none'; place: string } | { status: 'unknown' } | { status: 'busy' };

/**
 * Find your town: type a town, county or state (known towns appear as you type; any other place is looked
 * up when you press Search), use your location, or tap one of your own towns.
 */
export function TownFinder({ towns, yourTowns }: { towns: FinderTown[]; yourTowns: { path: string; label: string }[] }) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState<'search' | 'locate' | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const matches = matchTowns(towns, query);
  const typed = query.trim();
  const canSearch = typed.length >= 2;
  const optionCount = matches.length + (canSearch ? 1 : 0);
  const showOptions = open && optionCount > 0;

  async function search() {
    if (!canSearch || busy) return;
    setOpen(false);
    setBusy('search');
    setResult(null);
    try {
      const response = await fetch(`/communities/find?${new URLSearchParams({ q: typed })}`);
      const answer = await response.json() as SearchAnswer;
      if (answer.status === 'found') setResult({ kind: 'found', path: answer.community.path, label: answer.community.label, place: answer.place });
      else if (answer.status === 'none') setResult({ kind: 'message', text: `${answer.place} doesn’t have a leaderboard yet. A town gets one with its first report.` });
      else if (answer.status === 'unknown') setResult({ kind: 'message', text: `We couldn’t find “${typed}”. Try the town’s full name, or add its state.` });
      else setResult({ kind: 'message', text: 'Town search is busy right now. Please try again in a moment.' });
    } catch {
      setResult({ kind: 'message', text: 'Town search isn’t available right now. Please try again in a moment.' });
    } finally {
      setBusy(null);
    }
  }

  function locate() {
    if (busy) return;
    if (!('geolocation' in navigator)) {
      setResult({ kind: 'message', text: 'This browser can’t share your location. Search by name instead.' });
      return;
    }
    setBusy('locate');
    setResult(null);
    // The position stays in this browser: it is only compared with the towns already on the page.
    navigator.geolocation.getCurrentPosition(position => {
      setBusy(null);
      const nearest = nearestTown(towns, position.coords.latitude, position.coords.longitude);
      setResult(nearest && nearest.km <= NEAR_KM ? { kind: 'near', ...nearest }
        : { kind: 'message', text: 'No leaderboard near you yet. Your first report starts one for your town.' });
    }, error => {
      setBusy(null);
      setResult({ kind: 'message', text: error.code === error.PERMISSION_DENIED
        ? 'Location is off for this site. Search by name instead.'
        : 'Your location couldn’t be found. Search by name instead.' });
    }, { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 10_000 });
  }

  function choose(index: number) {
    if (index < matches.length) router.push(matches[index].path);
    else void search();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && optionCount) {
      event.preventDefault();
      setOpen(true);
      setActive(current => (current + 1) % optionCount);
    } else if (event.key === 'ArrowUp' && optionCount) {
      event.preventDefault();
      setOpen(true);
      setActive(current => (current <= 0 ? optionCount - 1 : current - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (showOptions && active >= 0) choose(active);
      else if (matches.length === 1 && matches[0].name.toLowerCase() === typed.toLowerCase()) router.push(matches[0].path);
      else void search();
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  return <section className={styles.finder} aria-labelledby={`${id}-title`}>
    <div className={styles.finderHead}>
      <h2 id={`${id}-title`}>Find your town</h2>
      <button type="button" className={styles.nearMe} onClick={locate} aria-busy={busy === 'locate'}>
        <FiNavigation aria-hidden="true" /> {busy === 'locate' ? 'Finding…' : 'Near me'}
      </button>
    </div>
    <div className={styles.finderBox}>
        <FiSearch aria-hidden="true" />
        <input type="search" role="combobox" value={query} placeholder="Town, city or county"
          aria-label="Find your town or county" aria-expanded={showOptions} aria-controls={`${id}-options`} aria-autocomplete="list"
          aria-activedescendant={showOptions && active >= 0 ? `${id}-option-${active}` : undefined}
          autoComplete="off" enterKeyHint="search" maxLength={80}
          onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); setResult(null); }}
          onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown} />
        {showOptions && <ul className={styles.finderOptions} id={`${id}-options`} role="listbox" aria-label="Towns">
          {matches.map((town, index) => <li key={town.path} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
            onMouseDown={event => event.preventDefault()} onClick={() => choose(index)} onMouseEnter={() => setActive(index)}>
            <span><strong>{town.name}</strong><span>{town.place}</span></span>
            <span className={styles.finderDetail}>{town.detail}</span>
          </li>)}
          {canSearch && <li id={`${id}-option-${matches.length}`} role="option" aria-selected={active === matches.length} data-search=""
            onMouseDown={event => event.preventDefault()} onClick={() => choose(matches.length)} onMouseEnter={() => setActive(matches.length)}>
            <span><FiSearch aria-hidden="true" /> Search for “{typed}”</span>
          </li>}
        </ul>}
    </div>

    <div aria-live="polite">
      {busy === 'search' && <p className={styles.finderMessage}>Searching…</p>}
      {result?.kind === 'found' && <Link className={styles.finderResult} href={result.path}>
        <FiMapPin aria-hidden="true" />
        <span><strong>{result.label}</strong><span>{result.place === result.label ? 'Leaderboard' : `Includes ${result.place}`}</span></span>
        <FiChevronRight aria-hidden="true" />
      </Link>}
      {result?.kind === 'near' && <Link className={styles.finderResult} href={result.town.path}>
        <FiNavigation aria-hidden="true" />
        <span><strong>{result.town.label}</strong><span>Nearest leaderboard, {result.km < 1 ? 'under 1' : Math.round(result.km)} km away</span></span>
        <FiChevronRight aria-hidden="true" />
      </Link>}
      {result?.kind === 'message' && <p className={styles.finderMessage}>{result.text}</p>}
    </div>

    {yourTowns.length > 0 && <nav className={styles.yourTowns} aria-label="Your towns">
      <span>Your towns</span>
      {yourTowns.map(town => <Link key={town.path} href={town.path}>{town.label}</Link>)}
    </nav>}
  </section>;
}
