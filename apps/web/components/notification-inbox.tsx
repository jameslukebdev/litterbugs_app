'use client';
import Link from 'next/link';
import { IoNotificationsOutline } from 'react-icons/io5';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { notificationHref, notificationPresentation, type CleanupNotification } from '@/lib/cleanup-notifications';
import { notifyDataChanged, useDataRefresh } from '@/lib/use-data-refresh';

type Notice = CleanupNotification & { report: { title: string | null } | null };
export function NotificationInbox({ userId }: { userId: string }) {
  return <AccountNotificationInbox key={userId} userId={userId} />;
}
function AccountNotificationInbox({ userId }: { userId: string }) {
  const refresh = useDataRefresh();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [failedReadIds, setFailedReadIds] = useState<string[]>([]);
  const mutation = useRef(false);
  const request = useRef(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const sequence = ++request.current;
    if (mutation.current) return;
    void (async () => {
      const { data, error } = await createClient().from('cleanup_notifications').select('*, report:reports!cleanup_notifications_report_id_fkey(title)')
        .eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(0, limit);
      if (error) throw error;
      if (!cancelled && sequence === request.current) { setNotices(data.slice(0, limit)); setHasMore(data.length > limit); setLoaded(true); setMessage(''); }
    })().catch(() => { if (!cancelled && sequence === request.current) { setLoaded(true); setMessage('Updates could not be refreshed. Check your connection and try again.'); } });
    return () => { cancelled = true; };
  }, [userId, limit, refresh, retry]);
  async function markRead(ids: string[]) {
    if (mutation.current || !ids.length) return;
    mutation.current = true;
    request.current++; // A pre-acknowledgement fetch cannot restore stale unread flags.
    setBusy(true);
    try {
      const { error } = await createClient().rpc('acknowledge_cleanup_notifications', { target_notification_ids: ids });
      if (error) throw error;
      setNotices(current => current.map(notice => ids.includes(notice.id) ? { ...notice, read_at: new Date().toISOString() } : notice));
      setFailedReadIds(current => current.filter(id => !ids.includes(id)));
      notifyDataChanged();
    } catch { setFailedReadIds(ids); }
    finally {
      mutation.current = false;
      setBusy(false);
      setRetry(value => value + 1);
    }
  }
  const unread = notices.filter(notice => !notice.read_at);
  return <section className="notification-inbox">
    <header><h1>Notifications</h1><p>Updates to your reports, cleanups and payments. Read status is shared with the app. Reading an update does not complete a task. Updates refresh automatically while this page is open.</p></header>
    {!!unread.length && <button className="secondary-button" disabled={busy} onClick={() => void markRead(unread.map(notice => notice.id))}>Mark displayed updates as read</button>}
    {!!failedReadIds.length && <p role="alert">Could not mark these updates as read. <button disabled={busy} onClick={() => void markRead(failedReadIds)}>Retry marking read</button></p>}
    {message && <p role="alert">{message} <button onClick={() => setRetry(value => value + 1)}>Retry updates</button></p>}
    {!loaded && <p role="status">Loading updates…</p>}
    {loaded && !notices.length && !message && <p>No updates yet. Cleanup activity will appear here.</p>}
    <ul className="notification-list">{notices.map(notice => {
      const copy = notificationPresentation(notice);
      return <li key={notice.id} data-unread={!notice.read_at}>
        <div>{!notice.read_at && <span className="notification-unread">Unread</span>}<Link href={notificationHref(notice)}><strong>{copy.title}</strong></Link><p className="notification-report">{notice.report?.title || 'Report details unavailable'}</p><p>{copy.message}</p><time dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleString()}</time></div>
        {!notice.read_at && <button className="secondary-button compact-button" disabled={busy} onClick={() => void markRead([notice.id])}>Mark read</button>}
      </li>;
    })}</ul>
    {hasMore && <button className="secondary-button" onClick={() => setLimit(value => value + 50)}>Load older updates</button>}
  </section>;
}

export function NotificationLink({ userId }: { userId: string }) {
  const refresh = useDataRefresh();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await createClient().from('cleanup_notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null);
      if (!cancelled) setCount(result.error ? null : result.count);
    })().catch(() => { if (!cancelled) setCount(null); });
    return () => { cancelled = true; };
  }, [userId, refresh]);
  return <Link className="notification-link" href="/account/notifications" aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}><IoNotificationsOutline aria-hidden /><span className="notification-label">Updates</span>{count ? <span className="notification-count">{count > 99 ? '99+' : count}</span> : null}</Link>;
}
