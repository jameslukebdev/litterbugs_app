import 'server-only';

import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { object, validateData, type Source, type SourceData, type Window } from './model';

type Friction = SourceData['clarity'];
type Ledger = { day: string; attempts: number; nextAttemptAt: number; credential: string; source: Source<Friction> | null };
const COOLDOWN = 6 * 60 * 60 * 1000;
let pending: Promise<Source<Friction>> | undefined;

// Survives local server restarts and date/view switches. Reserve the request
// before network I/O, including failures, so retries cannot spend Clarity's quota.
export async function localClaritySource(credential: string, window: Window, loader: () => Promise<Friction>, note: string): Promise<Source<Friction>> {
  if (process.env.NODE_ENV !== 'development') throw new Error('Local cache disabled');
  if (pending) return pending;
  pending = load(credential, window, loader, note)
    .catch((): Source<Friction> => ({ status: 'error', data: null, window, updatedAt: null, note: 'Recent visits are temporarily unavailable.' }))
    .finally(() => { pending = undefined; });
  return pending;
}

async function load(credential: string, window: Window, loader: () => Promise<Friction>, note: string): Promise<Source<Friction>> {
  const unavailable: Source<Friction> = { status: 'error', data: null, window, updatedAt: null, note: 'Recent visits are temporarily unavailable.' };
  const dir = join(process.cwd(), '.analytics-local');
  const file = join(dir, 'clarity-live.json');
  const lock = `${file}.lock`;
  const read = async (): Promise<Ledger | null> => {
    try {
      const record = object(JSON.parse(await readFile(file, 'utf8')));
      if (typeof record.day !== 'string' || !Number.isSafeInteger(record.attempts) || Number(record.attempts) < 0 || typeof record.nextAttemptAt !== 'number' || !Number.isFinite(record.nextAttemptAt) || typeof record.credential !== 'string') return null;
      let source: Source<Friction> | null = null;
      if (record.source) {
        const saved = object(record.source); const dates = object(saved.window);
        if (saved.status !== 'live' && saved.status !== 'error') return null;
        if (typeof saved.updatedAt !== 'string' || !Number.isFinite(Date.parse(saved.updatedAt)) || typeof dates.start !== 'string' || typeof dates.end !== 'string') return null;
        source = { status: saved.status, updatedAt: saved.updatedAt, window: { start: dates.start, end: dates.end, timezone: 'UTC · rolling 72 hours' }, data: saved.status === 'live' ? validateData('clarity', saved.data) : null, note };
      }
      return { day: record.day, attempts: Number(record.attempts), nextAttemptAt: record.nextAttemptAt, credential: record.credential, source };
    } catch { return null; }
  };
  const cached = (record: Ledger | null) => record && record.credential === credential && record.nextAttemptAt > Date.now() ? record.source ?? unavailable : null;
  const before = await read(); const hit = cached(before); if (hit) return hit;
  await mkdir(dir, { recursive: true, mode: 0o700 });
  // A crashed process can leave a lock. Its already-written cooldown still wins.
  try { if (Date.now() - (await stat(lock)).mtimeMs > 60_000) await unlink(lock); } catch { /* no stale lock */ }
  let handle;
  try { handle = await open(lock, 'wx', 0o600); } catch { return unavailable; }
  try {
    const record = await read(); const raced = cached(record); if (raced) return raced;
    const now = Date.now(); const day = new Date(now).toISOString().slice(0, 10);
    const attempts = record?.day === day ? record.attempts : 0;
    if (attempts >= 8) return unavailable; // reserve two calls for owner diagnostics
    const next: Ledger = { day, attempts: attempts + 1, nextAttemptAt: now + COOLDOWN, credential, source: null };
    const save = async () => {
      const temporary = `${file}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
      await rename(temporary, file);
    };
    await save();
    const updatedAt = new Date(now).toISOString();
    const observedWindow = { start: new Date(now - 72 * 60 * 60 * 1000).toISOString(), end: updatedAt, timezone: 'UTC · rolling 72 hours' };
    try { next.source = { status: 'live', data: validateData('clarity', await loader()), window: observedWindow, updatedAt, note }; }
    catch { next.source = { ...unavailable, window: observedWindow, updatedAt }; }
    await save();
    return next.source;
  } finally { await handle.close(); await unlink(lock).catch(() => {}); }
}
