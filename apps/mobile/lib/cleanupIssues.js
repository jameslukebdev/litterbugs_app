import { supabase } from './supabase';

export const ISSUE_REASONS = Object.freeze([
  ['access', 'Can’t reach the litter'], ['information', 'Need more information'],
  ['unsafe', 'Unsafe to clean'], ['moved', 'Litter has moved'],
  ['missing', 'No litter here'], ['other', 'Something else'],
]);
const checked = ({ data, error }) => { if (error) throw error; return data; };
export const isTeamIssue = (reason) => ['unsafe', 'moved', 'missing'].includes(reason);
export function issueStatus(issue, userId) {
  if (issue.review_outcome === 'closed') return 'Report closed';
  if (issue.status === 'resolved') return issue.keeps_claim ? 'Cleanup resumed' : 'Resolved';
  if (issue.requires_team_review || issue.status === 'team_review') return 'Litterbugs review';
  if (issue.status === 'awaiting_cleaner') return userId === issue.cleaner_id ? 'Response ready' : 'Awaiting cleaner';
  return userId === issue.reporter_id ? 'Reply needed' : 'Awaiting reply';
}
export function issueActions(issue, userId) {
  const participant = Boolean(userId && [issue?.cleaner_id, issue?.reporter_id].includes(userId));
  const resolved = issue?.status === 'resolved';
  return {
    canReply: participant && !resolved,
    canEdit: participant && userId === issue.reporter_id && !resolved,
    canResume: participant && userId === issue.cleaner_id && issue.status === 'awaiting_cleaner' && !issue.requires_team_review,
  };
}
export function canEditReportContent(report, userId) {
  return Boolean(userId && report?.user_id === userId && report.is_published !== false
    && !report.cancelled_at && !report.expired_at && !report.moderated_at
    && (!report.renewal_status || report.renewal_status === 'active')
    && ['available', 'claimed'].includes(report.cleanup_state));
}
export function issueError(error) {
  const message = error?.message || '';
  if (/changed_refresh/.test(message)) return 'There’s a newer update. Refresh before trying again.';
  if (/not_allowed|not_found|permission|42501/.test(message)) return 'This action isn’t available for your account.';
  if (/not_ready|paused_for_issue/.test(message)) return 'This cleanup is paused until the issue is resolved.';
  if (/unavailable|claim_changed/.test(message)) return 'This cleanup has changed. Refresh to see its current status.';
  if (/photo|image/i.test(message)) return 'The photo could not be saved. Your message is still here. Try again.';
  return 'We couldn’t confirm the change. Your message is still here. Try again.';
}
export async function loadReportIssue(reportId) {
  if (!reportId) return null;
  return checked(await supabase.from('cleanup_issues').select('*').eq('report_id', reportId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle());
}
export async function loadIssueRequest(cleanupId, userId) {
  const attempt = checked(await supabase.from('cleanup_attempts').select('id,report_id,cleaner_id,reporter_id,status,claim_expires_at,issue_paused_at').eq('id', cleanupId).single());
  if (attempt.cleaner_id !== userId || attempt.reporter_id === userId || attempt.status !== 'claimed') throw new Error('issue_request_not_allowed');
  const report = checked(await supabase.from('reports').select('id,title,cleanup_issue_hold').eq('id', attempt.report_id).single());
  return { attempt, report };
}
export async function loadIssue(issueId, userId) {
  const issue = checked(await supabase.from('cleanup_issues').select('*').eq('id', issueId).single());
  if (![issue.cleaner_id, issue.reporter_id].includes(userId)) throw new Error('issue_not_allowed');
  const [messageResult, reportResult] = await Promise.all([
    supabase.from('cleanup_issue_messages').select('*').eq('issue_id', issueId).order('created_at').order('id'),
    supabase.from('reports').select('id,title,user_id,photo_paths,notes_other,additional_information,content_revision').eq('id', issue.report_id).single(),
  ]);
  const messages = checked(messageResult);
  const report = checked(reportResult);
  const ids = [...new Set(messages.map(row => row.author_id).filter(Boolean))];
  const profiles = ids.length ? checked(await supabase.from('profiles').select('id,display_name').in('id', ids)) : [];
  const names = Object.fromEntries(profiles.map(p => [p.id, p.display_name || 'Community member']));
  const photos = {};
  for (const path of [...new Set(messages.flatMap(row => row.photo_paths || []))]) {
    photos[path] = checked(await supabase.storage.from('cleanup_issue_photos').createSignedUrl(path, 60)).signedUrl;
  }
  return { issue, messages, report, names, photos };
}
export async function openIssue(payload) { return checked(await supabase.rpc('open_cleanup_issue', payload)); }
export async function replyIssue(payload) { return checked(await supabase.rpc('reply_cleanup_issue', payload)); }
export async function resumeIssue(issue) {
  return checked(await supabase.rpc('resolve_cleanup_issue', { target_issue_id: issue.id, expected_version: issue.version }));
}
export async function loadEditableReport(reportId, userId) {
  const report = checked(await supabase.from('reports').select('*').eq('id', reportId).single());
  if (!canEditReportContent(report, userId)) throw new Error('report_edit_not_allowed');
  return report;
}
export async function updateReportContent(payload) {
  return checked(await supabase.rpc('update_report_content', payload));
}
