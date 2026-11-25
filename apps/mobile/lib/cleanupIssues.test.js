import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { rpc } }));
import { canEditReportContent, issueActions, issueStatus, isTeamIssue, openIssue, replyIssue, resumeIssue, updateReportContent } from './cleanupIssues';
import { cleanupNotificationDestination, cleanupNotificationPresentation } from './cleanupNotifications';
import { isCleanupAvailable } from './cleanupEligibility';

describe('cleanup issue participant actions', () => {
  const issue = { id: 'issue', reporter_id: 'reporter', cleaner_id: 'cleaner', version: 7, status: 'awaiting_cleaner', keeps_claim: true, requires_team_review: false };
  it('lets the reporter reply/edit and the cleaner explicitly resume', () => {
    expect(issueActions(issue, 'reporter')).toEqual({ canReply: true, canEdit: true, canResume: false });
    expect(issueActions(issue, 'cleaner')).toEqual({ canReply: true, canEdit: false, canResume: true });
    expect(issueStatus(issue, 'cleaner')).toBe('Response ready');
  });
  it('never offers private actions to outsiders or guests', () => {
    for (const userId of ['outsider', null, undefined]) expect(issueActions(issue, userId)).toEqual({ canReply: false, canEdit: false, canResume: false });
  });
  it('does not resume a staff hold or resume before the reporter responds', () => {
    expect(issueActions({ ...issue, requires_team_review: true }, 'cleaner').canResume).toBe(false);
    expect(issueActions({ ...issue, status: 'awaiting_reporter' }, 'cleaner').canResume).toBe(false);
    expect(issueActions({ ...issue, status: 'resolved' }, 'cleaner').canReply).toBe(false);
    expect(issueStatus({ ...issue, review_outcome: 'closed' }, 'reporter')).toBe('Report closed');
    expect(['unsafe', 'moved', 'missing'].every(isTeamIssue)).toBe(true);
    expect(isTeamIssue('access')).toBe(false);
  });
  it('keeps held sites unavailable for new cleanup offers', () => {
    expect(isCleanupAvailable({ cleanup_state: 'available', cleanup_issue_hold: true })).toBe(false);
    expect(isCleanupAvailable({ cleanup_state: 'available', cleanup_issue_hold: false })).toBe(true);
  });
  it('allows funded/claimed owner content edits without granting deletion or completed edits', () => {
    const report = { user_id: 'reporter', cleanup_state: 'claimed', funding_locked_at: 'now', is_published: true, renewal_status: 'active' };
    expect(canEditReportContent(report, 'reporter')).toBe(true);
    expect(canEditReportContent(report, 'cleaner')).toBe(false);
    for (const patch of [{ cleanup_state: 'completed' }, { cleanup_state: 'completion_submitted' }, { renewal_status: 'expired' }, { cancelled_at: 'now' }, { moderated_at: 'now' }, { is_published: false }]) expect(canEditReportContent({ ...report, ...patch }, 'reporter')).toBe(false);
  });
});
describe('versioned server writes', () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: { id: 'saved' }, error: null }); });
  it('preserves the caller idempotency key and expected version on retry', async () => {
    const payload = { target_issue_id: 'issue', message_id: 'same-id', expected_version: 4, message_body: 'Use the east gate', message_photos: [] };
    await replyIssue(payload); await replyIssue(payload);
    expect(rpc.mock.calls).toEqual([['reply_cleanup_issue', payload], ['reply_cleanup_issue', payload]]);
  });
  it('resumes through the issue RPC with its current version', async () => {
    await resumeIssue({ id: 'issue', version: 9 });
    expect(rpc).toHaveBeenCalledWith('resolve_cleanup_issue', { target_issue_id: 'issue', expected_version: 9 });
  });
  it('does not hide server conflicts or write reports directly', async () => {
    const error = new Error('report_changed_refresh'); rpc.mockResolvedValue({ error });
    await expect(updateReportContent({ expected_revision: 1 })).rejects.toBe(error);
    rpc.mockResolvedValue({ data: { id: 'saved' } });
    await openIssue({ request_id: 'stable' });
    expect(rpc).toHaveBeenLastCalledWith('open_cleanup_issue', { request_id: 'stable' });
  });
});
describe('issue alert destinations', () => {
  it.each(['cleanup_issue_requested', 'cleanup_issue_replied', 'cleanup_issue_report_updated', 'cleanup_issue_resolved'])('opens the exact private conversation for %s', eventType => {
    expect(cleanupNotificationDestination({ eventType, issueId: 'issue', reportId: 'report' })).toEqual({ name: 'CleanupIssue', label: 'View conversation', params: { issueId: 'issue' } });
    expect(cleanupNotificationDestination({ event_type: eventType, issue_id: 'issue' }).name).toBe('CleanupIssue');
    expect(cleanupNotificationPresentation([{ event_type: eventType }]).title).not.toBe('Cleanup update');
  });
  it('preserves the report fallback for older incomplete payloads', () => {
    expect(cleanupNotificationDestination({ eventType: 'cleanup_issue_replied', reportId: 'report', cleanupId: 'claim' })).toMatchObject({ name: 'App', params: { screen: 'Map', params: { reportId: 'report' } } });
  });
});
