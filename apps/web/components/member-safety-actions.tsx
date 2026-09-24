'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { realUserId } from '@/lib/report-access';
const reasons = [
  ['spam_or_misleading', 'Spam or misleading'], ['harassment_or_hate', 'Harassment or hate'],
  ['inappropriate_content', 'Inappropriate content'], ['impersonation', 'Impersonation'],
  ['safety_concern', 'Safety concern'], ['other', 'Other'],
];
export function MemberSafetyActions({ profileId, sourceReportId, onBlocked }: { profileId: string; sourceReportId?: string; onBlocked: () => void }) {
  const [viewer, setViewer] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => { let cancelled = false; void createClient().auth.getUser().then(({ data }) => { if (!cancelled) setViewer(realUserId(data.user)); }); return () => { cancelled = true; }; }, []);
  if (!viewer || viewer === profileId) return null;
  async function block() {
    if (busy || !window.confirm('Block this account? Their profile and reports will be hidden from your signed-in experience. They won’t be notified.')) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await createClient().from('user_blocks').insert({ blocker_id: viewer!, blocked_id: profileId });
      if (error && error.code !== '23505') throw error;
      onBlocked();
    } catch { setMessage('Couldn’t block this account. Please try again.'); }
    finally { setBusy(false); }
  }
  async function report(event: React.FormEvent) {
    event.preventDefault(); if (busy || sent) return;
    if (!reason || (reason === 'other' && !details.trim())) { setMessage('Choose a reason and add an explanation for Other.'); return; }
    setBusy(true); setMessage('');
    try {
      const { error } = await createClient().from('user_moderation_reports').insert({ reporter_id: viewer!, reported_user_id: profileId, source_report_id: sourceReportId ?? null, reason, details: details.trim() || null });
      if (error) throw error;
      setSent(true); setMessage('Report received. Your report was submitted for review.');
    } catch { setMessage('Couldn’t submit your report. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="member-safety-actions">
    <div className="account-actions"><button className="secondary-button" disabled={busy || sent} onClick={() => setReporting(value => !value)}>Report account</button><button className="danger-button" disabled={busy} onClick={block}>Block account</button></div>
    {reporting && !sent && <form onSubmit={report}><h3>Why are you reporting this account?</h3><p>Your report is private and will be reviewed by our team.</p><label>Reason<select required value={reason} onChange={event => setReason(event.target.value)} disabled={busy}><option value="">Choose a reason</option>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Details<textarea maxLength={2000} value={details} onChange={event => setDetails(event.target.value)} disabled={busy} /></label><button className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Submit report'}</button></form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
