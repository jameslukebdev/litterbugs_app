/** Device writes continue through client-side navigation. Keep failures recoverable until retried. */
type Save = { pending: number; failed: boolean; retry?: () => Promise<unknown>; revision: number };
const saves = new Map<string, Save>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export const deviceSaveKey = (owner: string, key: string) => `${owner}:${key}`;
export const subscribeDeviceSaves = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function deviceSaveStatus(owner?: string) {
  const values = [...saves].filter(([key]) => !owner || key.startsWith(`${owner}:`)).map(([, value]) => value);
  return { pending: values.some(value => value.pending > 0), failed: values.some(value => value.failed) };
}
export async function trackDeviceSave<T>(owner: string, key: string, write: () => Promise<T>): Promise<T> {
  const id = deviceSaveKey(owner, key);
  const state = saves.get(id) ?? { pending: 0, failed: false, revision: 0 };
  const revision = ++state.revision;
  state.pending++; state.retry = () => trackDeviceSave(owner, key, write); saves.set(id, state); emit();
  try {
    const result = await write();
    if (revision === state.revision) { state.failed = false; state.retry = undefined; }
    return result;
  } catch (error) { if (revision === state.revision) state.failed = true; throw error; }
  finally { state.pending--; emit(); }
}
export async function retryDeviceSaves() {
  await Promise.allSettled([...saves.values()].filter(value => value.failed && !value.pending).map(value => value.retry?.()));
}
export function forgetDeviceSave(owner: string, key: string) { saves.delete(deviceSaveKey(owner, key)); emit(); }

export function forgetOtherDeviceSaves(owner: string | null) { for (const key of saves.keys()) if (!owner || !key.startsWith(`${owner}:`)) saves.delete(key); emit(); }
