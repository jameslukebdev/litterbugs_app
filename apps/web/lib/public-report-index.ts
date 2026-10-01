import 'server-only';
import { createPublicClient } from '@/lib/supabase/public';
import { isPubliclyShareableReport } from '@/lib/public-report-share-model';

export async function loadPublicReportIndex() {
  const supabase = createPublicClient();
  const reports = [];
  let afterId: string | undefined;
  for (;;) {
    let query = supabase.from('reports')
      .select('id, title, created_at, cleanup_state, cancelled_at, expired_at, expires_at, is_sample, is_published')
      .eq('is_published', true).eq('is_sample', false)
      .is('cancelled_at', null).is('expired_at', null)
      .order('id').limit(1000);
    if (afterId) query = query.gt('id', afterId);
    const { data, error } = await query;
    // A backend outage should not publish an apparently successful empty sitemap.
    if (error) throw error;
    reports.push(...data.filter(report => isPubliclyShareableReport(report)));
    if (data.length < 1000) return reports;
    afterId = data[data.length - 1].id;
    if (reports.length >= 49_000) throw new Error('Public report sitemap requires partitioning');
  }
}
