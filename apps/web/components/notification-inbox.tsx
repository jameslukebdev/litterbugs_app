'use client';
import { reportContext } from '@/lib/report-context';
import Link from 'next/link';
import { IoNotificationsOutline } from 'react-icons/io5';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { notificationHref, notificationPresentation, type CleanupNotification } from '@/lib/cleanup-notifications';
import { notificationInboxHref, type NotificationView } from '@/lib/notification-view';
import { notifyDataChanged, useDataRefresh } from '@/lib/use-data-refresh';

type Notice = CleanupNotification & { report: ({ title: string | null } & import('@/lib/report-context').ReportContextFields) | null };
const defaultView: NotificationView = { filter: 'all', page: 1 };
export function NotificationInbox({ userId, view = defaultView }: { userId: string; view?: NotificationView }) {
  return <AccountNotificationInbox key={userId} userId={userId} view={view} />;
}
function AccountNotificationInbox({ userId, view }: { userId: string; view: NotificationView }) {
  const { filter, page } = view;
  const refresh = useDataRefresh();
  const [snapshot, setSnapshot] = useState<{ filter: string; page: number; notices: Notice[]; hasMore: boolean; loaded: boolean }>({ filter, page, notices: [], hasMore: false, loaded: false });
  const notices = snapshot.filter === filter && snapshot.page === page ? snapshot.notices.filter(notice => filter !== 'unread' || !notice.read_at) : [];
  const loaded = snapshot.filter === filter && snapshot.page === page && snapshot.loaded;
  const hasMore = snapshot.filter === filter && snapshot.page === page && snapshot.hasMore;
  const restoredAnchor = useRef('');
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
      let query = createClient().from('cleanup_notifications').select('*, report:reports!cleanup_notifications_report_id_fkey(id,title,created_at,litter_types,types)').eq('user_id', userId);
      if (filter === 'unread') query = query.is('read_at', null);
      const { data, error } = await query.order('created_at', { ascending: false }).order('id').range((page - 1) * 50, page * 50);
      if (error) throw error;
      if (!cancelled && sequence === request.current) { setSnapshot({ filter, page, notices: data.slice(0, 50), hasMore: data.length > 50, loaded: true }); setMessage(''); }
    })().catch(() => { if (!cancelled && sequence === request.current) { setSnapshot(previous => previous.filter === filter && previous.page === page ? { ...previous, loaded: true } : { filter, page, notices: [], hasMore: false, loaded: true }); setMessage('Updates could not be refreshed. Check your connection and try again.'); } });
    return () => { cancelled = true; };
  }, [userId, filter, page, refresh, retry]);
  async function markRead(ids: string[]) {
    if (mutation.current || !ids.length) return;
    mutation.current = true;
    request.current++; // A pre-acknowledgement fetch cannot restore stale unread flags.
    setBusy(true);
    try {
      const { error } = await createClient().rpc('acknowledge_cleanup_notifications', { target_notification_ids: ids });
      if (error) throw error;
      setSnapshot(current => ({ ...current, notices: current.notices.map(notice => ids.includes(notice.id) ? { ...notice, read_at: new Date().toISOString() } : notice) }));
      setFailedReadIds(current => current.filter(id => !ids.includes(id)));
      notifyDataChanged();
    } catch { setFailedReadIds(current => [...new Set([...current, ...ids])]); }
    finally {
      mutation.current = false;
      setBusy(false);
      setRetry(value => value + 1);
    }
  }
  useEffect(() => {
    // Explicit return links may arrive before the asynchronous inbox rows exist.
    const anchor = window.location.hash.slice(1);
    if (!loaded || !anchor.startsWith('notification-') || restoredAnchor.current === anchor) return;
    const row = document.getElementById(anchor);
    if (row) { row.scrollIntoView({ block: 'center' }); row.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true }); }
    else document.getElementById('notification-heading')?.focus();
    restoredAnchor.current = anchor;
  }, [loaded, snapshot]);
  const unread = notices.filter(notice => !notice.read_at);
  return <section className="notification-inbox">
    <header><h1 id="notification-heading" tabIndex={-1}>Notifications</h1><p>Updates to your reports, cleanups and payments. Read status is shared with the app. Reading an update does not complete a task. Updates refresh automatically while this page is open.</p></header>
    <nav className="activity-tabs" aria-label="Notification filters">
      <Link href={notificationInboxHref({ filter: 'all', page: 1 })} aria-current={filter === 'all' ? 'page' : undefined}>All updates</Link>
      <Link href={notificationInboxHref({ filter: 'unread', page: 1 })} aria-current={filter === 'unread' ? 'page' : undefined}>Unread</Link>
    </nav>
    {!!unread.length && <button className="secondary-button" disabled={busy} onClick={() => void markRead(unread.map(notice => notice.id))}>Mark displayed updates as read</button>}
    {!!failedReadIds.length && <p role="alert">Could not mark these updates as read. <button disabled={busy} onClick={() => void markRead(failedReadIds)}>Retry marking read</button></p>}
    {message && <p role="alert">{message} <button onClick={() => setRetry(value => value + 1)}>Retry updates</button></p>}
    {!loaded && <p role="status">Loading updates…</p>}
    {loaded && !notices.length && !message && <p>{page > 1 ? 'No updates on this page.' : filter === 'unread' ? 'You’re caught up. No unread updates.' : 'No updates yet. Cleanup activity will appear here.'}</p>}
    <ul className="notification-list">{notices.map(notice => {
      const copy = notificationPresentation(notice);
      return <li key={notice.id} id={`notification-${notice.id}`} data-unread={!notice.read_at}>
        <div>{!notice.read_at && <span className="notification-unread">Unread</span>}<Link href={notificationHref(notice, view)} onClick={() => { if (!notice.read_at) void markRead([notice.id]); }}><strong>{copy.title}</strong></Link><p className="notification-report">{notice.report?.title || 'Report details unavailable'}</p>{notice.report && <p className="report-context">{reportContext(notice.report)}</p>}<p>{copy.message}</p><time dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleString()}</time></div>
        {!notice.read_at && <button className="secondary-button compact-button" disabled={busy} onClick={() => void markRead([notice.id])}>Mark read</button>}
      </li>;
    })}</ul>
    <nav className="account-actions" aria-label="Notification pages">
      {page > 1 && <Link className="secondary-button" href={notificationInboxHref({ filter, page: page - 1 })}>Newer updates</Link>}
      {hasMore && <Link className="secondary-button" href={notificationInboxHref({ filter, page: page + 1 })}>Older updates</Link>}
    </nav>
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
