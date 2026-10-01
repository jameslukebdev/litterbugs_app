export type PreferenceKind = 'favorites' | 'hidden';
export type SyncedPreferences = { favorites: string[]; hidden: string[] };
type Operation = { id: string; reportId: string; kind: PreferenceKind; enabled: boolean };
type Seed = { reportId: string; kind: PreferenceKind };
type State = { preferences: SyncedPreferences; pending: Operation[]; seed: Seed[]; imported: boolean };
type Snapshot = { preferences: SyncedPreferences; pending: boolean; offline: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kinds: PreferenceKind[] = ['favorites', 'hidden'];
const validPreferences = (value: SyncedPreferences) => value && kinds.every(kind => Array.isArray(value[kind]) && value[kind].every(id => typeof id === 'string'));
function apply(preferences: SyncedPreferences, op: Operation): SyncedPreferences {
  return { ...preferences, [op.kind]: op.enabled ? [...new Set([...preferences[op.kind], op.reportId])] : preferences[op.kind].filter(id => id !== op.reportId) };
}

/** One durable outbox per account, shared by web/native adapters. Server operation
 * identities make retries safe even when another device has since changed a row. */
export function createPreferenceSync(adapter: {
  read: (owner: string) => Promise<string | null>;
  write: (owner: string, value: string) => Promise<void>;
  legacy: (owner: string) => Promise<SyncedPreferences>;
  remote: (owner: string, seed: Seed[], operations: Operation[]) => Promise<SyncedPreferences>;
  id: () => string;
  exclusive?: <T>(owner: string, work: () => Promise<T>) => Promise<T>;
}) {
  const queues = new Map<string, Promise<unknown>>();
  const retired = new Set<string>();
  function serialize<T>(owner: string, work: () => Promise<T>): Promise<T> {
    const next = (queues.get(owner) ?? Promise.resolve()).catch(() => undefined).then(() => adapter.exclusive ? adapter.exclusive(owner, work) : work());
    queues.set(owner, next);
    return next;
  }
  async function read(owner: string): Promise<State> {
    if (retired.has(owner)) throw new Error('This account was deleted.');
    const raw = await adapter.read(owner);
    if (raw) {
      const state = JSON.parse(raw) as State;
      if (!validPreferences(state.preferences) || !Array.isArray(state.pending) || !Array.isArray(state.seed)
        || typeof state.imported !== 'boolean' || !state.pending.every(op => uuid.test(op.id) && uuid.test(op.reportId) && kinds.includes(op.kind) && typeof op.enabled === 'boolean')
        || !state.seed.every(item => uuid.test(item.reportId) && kinds.includes(item.kind))) throw new Error('Saved preferences could not be read.');
      return state;
    }
    const preferences = await adapter.legacy(owner);
    return { preferences, pending: [], imported: false, seed: kinds.flatMap(kind => preferences[kind].filter(id => uuid.test(id)).map(reportId => ({ kind, reportId }))) };
  }
  const snapshot = (state: State, offline = false): Snapshot => ({ preferences: state.preferences, pending: !!state.pending.length || !state.imported, offline });
  return {
    retire: (owner: string) => {
      retired.add(owner);
      return serialize(owner, async () => { await adapter.write(owner, ''); });
    },
    load: (owner: string) => serialize(owner, async () => snapshot(await read(owner))),
    set: (owner: string, kind: PreferenceKind, reportId: string, enabled: boolean) => serialize(owner, async () => {
      if (!uuid.test(reportId)) throw new Error('Invalid report.');
      const state = await read(owner);
      const operation = { id: adapter.id(), kind, reportId, enabled };
      state.preferences = apply(state.preferences, operation);
      if (owner !== 'guest') state.pending.push(operation);
      else state.imported = true;
      await adapter.write(owner, JSON.stringify(state));
      return snapshot(state);
    }),
    sync: (owner: string) => serialize(owner, async () => {
      const state = await read(owner);
      if (owner === 'guest') return { ...snapshot(state), pending: false };
      // Checkpoint the import before contacting the server; retries must use the
      // original seed, never a later locally edited snapshot.
      await adapter.write(owner, JSON.stringify(state));
      try {
        do {
          const batch = state.pending.slice(0, 100);
          const preferences = await adapter.remote(owner, state.imported ? [] : state.seed, batch);
          if (!validPreferences(preferences)) throw new Error('Invalid preferences response.');
          const next: State = { imported: true, seed: [], pending: state.pending.slice(batch.length), preferences };
          next.preferences = next.pending.reduce(apply, preferences);
          await adapter.write(owner, JSON.stringify(next));
          Object.assign(state, next);
        } while (state.pending.length);
        return snapshot(state);
      } catch { return snapshot(state, true); }
    }),
  };
}
