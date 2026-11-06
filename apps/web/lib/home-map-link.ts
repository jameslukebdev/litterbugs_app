export const LITTER_MAP_HREF = '/map?view=map';
export const AVAILABLE_CLEANUPS_MAP_HREF = `${LITTER_MAP_HREF}&browse=1&status=available` as const;

/** "Report trash" entry: open sign-up over the map directly (no blank redirect hop); signed-in visitors are forwarded to /report. */
export const REPORT_ENTRY_HREF = '/sign-in?next=%2Freport&view=map' as const;
