'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { weeklyEmailBcc, weeklyEmailCsv, type WeeklyEmailRecipient } from '@litterbugs/report-contract';
import { loadWeeklyEmailRecipients } from '@/lib/weekly-email';
import styles from './weekly-email-list.module.css';

const SOURCE: Record<string, string> = { existing_default: 'Existing account', signup_default: 'Signup default', account_preference: 'Account settings', email_change: 'Email change', public_unsubscribe: 'Unsubscribe page' };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function WeeklyEmailList() {
  const [rows, setRows] = useState<WeeklyEmailRecipient[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('subscribed');
  const [page, setPage] = useState(0);
  const [address, setAddress] = useState('');
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const fresh = useCallback(async () => {
    const next = await loadWeeklyEmailRecipients();
    if (mounted.current) setRows(next);
    return next;
  }, []);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try { await fresh(); }
    catch { if (mounted.current) { setRows(null); setError('The email list could not be loaded. Check your admin session and try again.'); } }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }, [fresh]);
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; }; }, [refresh]);

  async function exportList(kind: 'bcc' | 'csv') {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try {
      // Recheck withdrawals at the moment of every export; never export the cached table.
      const next = await fresh();
      const audience = next.filter(row => row.subscribed);
      if (!audience.length) { setMessage('There are no subscribed accounts to export.'); return; }
      if (kind === 'bcc') {
        await navigator.clipboard.writeText(weeklyEmailBcc(audience));
        setMessage(`${audience.length} addresses copied.`);
      } else {
        const url = URL.createObjectURL(new Blob([weeklyEmailCsv(audience)], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = `litterbugs-email-list-${new Date().toISOString().slice(0,10)}.csv`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(`${audience.length} subscribed addresses exported.`);
      }
    } catch { setRows(null); setError('The export did not complete. Refresh the list and try again.'); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }

  async function copyFooter() {
    if (!address.trim()) return;
    setError(''); setMessage('');
    const origin = window.location.origin;
    const plain = `Litterbugs Community Cleanup\n${address.trim()}\nPrivacy policy: ${origin}/privacy\nUnsubscribe: ${origin}/unsubscribe\nEmail preferences: ${origin}/account/email-preferences`;
    const html = `<div style="font:12px/1.7 Arial,sans-serif;color:#666;border-top:1px solid #ddd;padding-top:20px"><p>Litterbugs Community Cleanup<br>${escapeHtml(address.trim()).replaceAll('\n','<br>')}</p><a href="${origin}/privacy">Privacy policy</a> | <a href="${origin}/unsubscribe">Unsubscribe</a> | <a href="${origin}/account/email-preferences">Email preferences</a></div>`;
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })]);
      } else await navigator.clipboard.writeText(plain);
      setMessage('Email footer copied.');
    } catch { setError('Couldn’t copy the footer.'); }
  }
  const subscribed = rows?.filter(row => row.subscribed).length ?? 0;
  const visible = (rows ?? []).filter(row => (filter === 'all' || row.subscribed === (filter === 'subscribed')) && `${row.name} ${row.email}`.toLowerCase().includes(query.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(visible.length / 25));
  const currentPage = Math.min(page, pageCount - 1);
  return <section className={styles.panel} data-clarity-mask="true" data-ph-no-capture>
    <div className={styles.counts}><div><strong>{rows ? subscribed : '—'}</strong><span>Subscribed</span></div><div><strong>{rows ? rows.length - subscribed : '—'}</strong><span>Unsubscribed</span></div><div><strong>{rows ? rows.length : '—'}</strong><span>Eligible accounts</span></div></div>
    <div className={styles.export}><div><h2>Recipients</h2></div><div className={styles.actions}><button onClick={() => { void exportList('bcc'); }} disabled={busy || !rows || !subscribed}>Copy Bcc list</button><button onClick={() => { void exportList('csv'); }} disabled={busy || !rows || !subscribed}>Download CSV</button></div></div>
    <div className={styles.tools}><div role="group" aria-label="Filter recipients">{['subscribed','unsubscribed','all'].map(value => <button key={value} onClick={() => { setFilter(value); setPage(0); }} aria-pressed={filter === value}>{value === 'all' ? 'All accounts' : value === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}</button>)}</div><input aria-label="Search recipients" placeholder="Search name or email" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /><button disabled={busy} onClick={() => { void refresh(); }}>{busy ? 'Refreshing…' : 'Refresh list'}</button></div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {message ? <p className={styles.success} role="status">{message}</p> : null}
    {!rows ? <p role="status">{busy ? 'Loading the email list…' : 'The email list is unavailable.'}</p> : <>
      <div className={styles.table}><table><thead><tr><th>Member</th><th>Litterbugs emails</th><th>Preference source</th></tr></thead><tbody>{visible.slice(currentPage*25,(currentPage+1)*25).map(row => <tr key={row.email}><td><strong>{row.name || 'Litterbugs member'}</strong><span>{row.email}</span></td><td>{row.subscribed ? 'Subscribed' : 'Unsubscribed'}</td><td>{SOURCE[row.source] ?? 'Account record'}</td></tr>)}</tbody></table></div>
      {!visible.length ? <p>No accounts match this view.</p> : null}
      <div className={styles.pagination}><span>{visible.length} matching accounts · Page {currentPage+1} of {pageCount}</span><button disabled={!currentPage} onClick={() => setPage(currentPage-1)}>Previous</button><button disabled={currentPage+1>=pageCount} onClick={() => setPage(currentPage+1)}>Next</button></div>
    </>}
    <section className={styles.footer}>
      <h2>Email footer</h2>
      <label>Business mailing address<textarea rows={3} maxLength={500} value={address} onChange={e => setAddress(e.target.value)} placeholder="Mailing address" /></label>
      <div className={styles.footerPreview}><p>Litterbugs Community Cleanup<br />{address || '[Business mailing address]'}</p><Link href="/privacy">Privacy policy</Link> | <Link href="/unsubscribe">Unsubscribe</Link> | <Link href="/account/email-preferences">Email preferences</Link></div>
      <button onClick={() => { void copyFooter(); }} disabled={!address.trim()}>Copy email footer</button>
    </section>
  </section>;
}
