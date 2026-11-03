import type { Profile } from './profile';

// In-memory only: reused across page navigation, cleared when identity changes.
// The server snapshot is always empty, so profiles never enter shared SSR state.
export type HeaderProfile = { userId: string; email: string; profile: Profile | null };
let snapshot: HeaderProfile | null = null;
const listeners = new Set<() => void>();
export const getHeaderProfile = () => snapshot;
export const getServerHeaderProfile = () => null;
export function subscribeHeaderProfile(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setHeaderProfile(value: HeaderProfile | null) {
  snapshot = value;
  listeners.forEach(listener => listener());
}
