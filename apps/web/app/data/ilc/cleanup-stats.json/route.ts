import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

const pageSize = 500;
const indexHeader = { 'X-Robots-Tag': 'noindex' };

export async function GET() {
  const asOf = new Date().toISOString();
  const monthlyCounts = new Map<string, number>();
  let total = 0;
  let lastId: string | undefined;

  try {
    const client = createPublicClient();
    for (;;) {
      let query = client
        .from('cleanup_attempts')
        .select('id, completed_at, report:reports!cleanup_attempts_report_id_fkey!inner()')
        .eq('status', 'completed')
        .not('final_submission_id', 'is', null)
        .lte('completed_at', asOf)
        .eq('report.cleanup_state', 'completed')
        .eq('report.is_published', true)
        .eq('report.is_sample', false)
        .is('report.moderated_at', null)
        .is('report.cancelled_at', null)
        .order('id')
        .limit(pageSize);
      if (lastId) query = query.gt('id', lastId);

      const { data, error } = await query;
      if (error) throw error;

      for (const row of data) {
        if (!row.completed_at) throw new Error('Completed cleanup lacks a completion date.');
        const month = new Date(row.completed_at).toISOString().slice(0, 7);
        monthlyCounts.set(month, (monthlyCounts.get(month) ?? 0) + 1);
      }

      total += data.length;
      if (data.length < pageSize) break;
      lastId = data[data.length - 1].id;
    }
  } catch {
    return Response.json({ error: 'Cleanup statistics are temporarily unavailable.' }, {
      status: 503,
      headers: { ...indexHeader, 'Cache-Control': 'no-store' },
    });
  }

  return Response.json({
    schema_version: 1,
    publisher: 'Litterbugs (Burrow Base LLC)',
    source: 'https://litterbugs.app/cleanups',
    as_of: asOf,
    time_zone: 'UTC',
    definition: 'Finalized cleanups recorded by Litterbugs on published, non-sample reports. Months use the recorded completion date and are listed when at least one cleanup was recorded.',
    completed_cleanups: total,
    monthly_completed_cleanups: [...monthlyCounts.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([month, completed_cleanups]) => ({ month, completed_cleanups })),
  }, {
    headers: { ...indexHeader, 'Cache-Control': 'public, max-age=300, s-maxage=3600' },
  });
}
