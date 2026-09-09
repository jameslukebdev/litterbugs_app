import { createClient } from '@supabase/supabase-js';

// Actual PostgREST request construction, with an in-memory HTTP response.
// Unknown filters fail the test instead of reaching any external service.
export function historyClient(rowsByTable) {
  const requests = [];
  let failure = false;
  const client = createClient('https://history-tests.invalid', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input) => {
      const url = new URL(input);
      requests.push(url);
      if (failure) return new Response(JSON.stringify({ message: 'offline' }), { status: 503 });
      let rows = [...(rowsByTable[url.pathname.split('/').pop()] ?? [])];
      for (const [key, filter] of url.searchParams) {
        if (['select', 'order', 'limit'].includes(key)) continue;
        if (key === 'or') {
          if (filter.startsWith('(expires_at.')) rows = rows.filter(row => !row.expires_at || Date.parse(row.expires_at) > Date.now());
          else {
            const match = filter.match(/^\(created_at\.lt\.(.+),and\(created_at\.eq\.(.+),id\.lt\.([0-9a-f-]+)\)\)$/);
            if (!match || match[1] !== match[2]) throw new Error('Unexpected cursor: ' + filter);
            rows = rows.filter(row => row.created_at < match[1] || (row.created_at === match[1] && row.id < match[3]));
          }
        } else {
          const value = row => key === 'report.cleanup_state' ? row.report?.cleanup_state : row[key];
          if (filter === 'is.null') rows = rows.filter(row => value(row) == null);
          else if (filter.startsWith('eq.')) rows = rows.filter(row => String(value(row)) === filter.slice(3));
          else if (filter.startsWith('in.(')) rows = rows.filter(row => filter.slice(4, -1).split(',').includes(value(row)));
          else throw new Error('Unexpected filter: ' + key + '=' + filter);
        }
      }
      rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      rows = rows.slice(0, Number(url.searchParams.get('limit') || rows.length));
      return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
    } },
  });
  return { client, requests, fail: () => { failure = true; } };
}
export const historyId = i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
