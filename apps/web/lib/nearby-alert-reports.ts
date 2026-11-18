import 'server-only';
import { getDistanceMiles } from '@litterbugs/report-contract';
import type { createClient } from '@/lib/supabase/server';
import { isDiscoverableReport } from './report-visibility';

type Client = Awaited<ReturnType<typeof createClient>>;
type Alert = { created_at: string; nearby_report_ids?: string[] | null };
const DAY_MS = 24 * 60 * 60 * 1000;
const RADIUS_MILES = 50;
const SELECT_REPORT = 'id,title,latitude,longitude,created_at,user_id,is_published,is_sample,cancelled_at,expired_at,cleanup_state,expires_at';

function inAlertArea(latitude: number, longitude: number, report: { latitude: number | null; longitude: number | null }) {
  if (report.latitude === null || report.longitude === null) return false;
  return getDistanceMiles({ latitude, longitude }, { latitude: report.latitude, longitude: report.longitude }) <= RADIUS_MILES;
}

export async function loadNearbyAlertReports(client: Client, userId: string, alert: Alert) {
  const savedIds = alert.nearby_report_ids;
  const query = () => client.from('reports').select(SELECT_REPORT)
    .eq('is_published', true).eq('is_sample', false).is('cancelled_at', null);
  let sameArea = false;
  let hasArea = false;
  let reports = [];

  if (savedIds) {
    for (let offset = 0; offset < savedIds.length; offset += 100) {
      const { data, error } = await query().in('id', savedIds.slice(offset, offset + 100));
      if (error) throw error;
      reports.push(...data);
    }
  } else {
    const { data: area, error } = await client.from('notification_preferences')
      .select('latitude,longitude,location_updated_at').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (area?.latitude == null || area.longitude == null) return { reports: [], exact: false, sameArea, hasArea };
    const { latitude, longitude, location_updated_at: updatedAt } = area;
    const sentAt = Date.parse(alert.created_at);
    hasArea = true;
    sameArea = updatedAt !== null && Date.parse(updatedAt) <= sentAt;
    const since = new Date(sentAt - DAY_MS).toISOString();
    // Old notices saved no report IDs. Match the send window and saved area without assuming current cleanup state.
    for (let offset = 0; ; offset += 200) {
      const { data, error } = await query()
        .gt('created_at', since).lte('created_at', alert.created_at).gt('expires_at', alert.created_at)
        .gte('latitude', latitude - RADIUS_MILES / 69).lte('latitude', latitude + RADIUS_MILES / 69)
        .order('created_at', { ascending: false }).order('id').range(offset, offset + 199);
      if (error) throw error;
      reports.push(...data.filter(report => report.user_id !== userId && inAlertArea(latitude, longitude, report)));
      if (data.length < 200) break;
    }
  }

  if (reports.length) {
    const [hidden, blocks] = await Promise.all([
      client.from('report_preferences').select('report_id').eq('user_id', userId).eq('kind', 'hidden').eq('enabled', true),
      client.from('user_blocks').select('blocked_id').eq('blocker_id', userId),
    ]);
    if (hidden.error) throw hidden.error;
    if (blocks.error) throw blocks.error;
    const hiddenIds = new Set(hidden.data.map(row => row.report_id));
    const blockedIds = new Set(blocks.data.map(row => row.blocked_id));
    reports = reports.filter(report => report.latitude !== null && report.longitude !== null && isDiscoverableReport(report)
      && !hiddenIds.has(report.id) && (!report.user_id || !blockedIds.has(report.user_id)));
  }

  return {
    reports: reports.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || a.id.localeCompare(b.id)),
    exact: savedIds != null,
    sameArea,
    hasArea,
  };
}
