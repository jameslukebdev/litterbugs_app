export const HISTORY_PAGE_SIZE = 25;

export function applyHistoryCursor(query, cursor) {
  if (!cursor) return query;
  // Keep full database timestamp precision, while rejecting PostgREST syntax.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(cursor.created_at) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.id)) {
    throw new Error('Invalid history cursor');
  }
  return query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
}

export function historyPage(rows = [], pageSize = HISTORY_PAGE_SIZE) {
  const items = rows.slice(0, pageSize);
  const last = items[items.length - 1];
  return { items, nextCursor: rows.length > pageSize ? { created_at: last.created_at, id: last.id } : null };
}
