import { BOONE_MAP_CENTER } from './map-preview-frame';

export const MAP_HOME_EVENT = 'litterbugs:map-home';
// Explicit browse state clears saved filters; explicit coordinates outrank the
// last visited city. The map fits the shared preview bounds on a fresh entry.
export const LITTER_MAP_HREF = `/map?view=map&browse=1&entry=boone&lat=${BOONE_MAP_CENTER.latitude.toFixed(6)}&lng=${BOONE_MAP_CENTER.longitude.toFixed(6)}&zoom=13` as const;
export const AVAILABLE_CLEANUPS_MAP_HREF = '/map?view=map&browse=1&status=available' as const;

/** "Report trash" entry: open sign-up over the map directly (no blank redirect hop); signed-in visitors are forwarded to /report. */
export const REPORT_ENTRY_HREF = '/sign-in?next=%2Freport&view=map' as const;
