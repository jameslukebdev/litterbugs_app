/** Homepage discovery lands on the map itself (with reports that need a cleanup), not the report list. */
export const HOME_MAP_HREF = '/map?view=map&browse=1&status=available';

/** "Report trash" entry: open sign-up over the map directly (no blank redirect hop); signed-in visitors are forwarded to /report. */
export const REPORT_ENTRY_HREF = '/sign-in?next=%2Freport&view=map' as const;
