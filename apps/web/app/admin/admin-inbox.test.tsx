// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminInbox, availableActions, closeBlockedReason } from './admin-inbox';

const invoke = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ functions: { invoke } }),
}));

afterEach(() => {
  cleanup();
  invoke.mockReset();
  vi.restoreAllMocks();
});

const openCases = [
  {
    id: 'case-dispute',
    case_type: 'dispute',
    status: 'open',
    priority: 1,
    title: 'Reporter disputed funded cleanup',
    summary: 'The after photo does not show the full area.',
    report_id: 'report-1',
    cleanup_attempt_id: 'cleanup-1',
    created_at: '2026-08-26T10:00:00Z',
    report_title: 'Creek trail litter',
    reward_amount_cents: 2500,
    review_due_at: null,
  },
  {
    id: 'case-payout',
    case_type: 'payout_failure',
    status: 'open',
    priority: 2,
    title: 'Cleanup payout needs attention',
    summary: 'Stripe transfer failed.',
    report_id: 'report-2',
    cleanup_attempt_id: 'cleanup-2',
    created_at: '2026-08-26T11:00:00Z',
    report_title: 'Park entrance cleanup',
    reward_amount_cents: 5000,
    review_due_at: null,
  },
];

const openDetail = {
  case: { ...openCases[0], context: {} },
  report: {
    title: 'Creek trail litter',
    severity: 'medium',
    funding_eligibility: 'eligible',
    photo_paths: ['cleaner/report/before.heic'],
  },
  attempt: {
    reward_amount_cents: 2500,
    financial_review_summary: 'The cleanup is plausible but disputed.',
    financial_review_status: 'passed',
    dispute_reason: 'The after photo does not show the full area.',
    dispute_status: 'open',
    first_paid_cleanup: false,
    payout_status: 'blocked',
  },
  contribution: null,
  cleaner_history: { completed_cleanups: 2, paid_rewards_sent: 1 },
  submissions: [{ id: 'submission-1', description: 'Removed three bags.', submission_number: 1, created_at: '2026-08-26T09:00:00Z' }],
  ai_checks: [{ id: 'check-1', status: 'passed', user_summary: 'Cleanup appears complete.', reason_codes: ['usable'], created_at: '2026-08-26T09:30:00Z' }],
  actions: [],
  photos: { before: ['https://example.com/before.jpg'], after: ['https://example.com/after.jpg'] },
};

describe('funded cleanup admin inbox', () => {
  it('filters cases and records a confirmed, reasoned decision with audit history', async () => {
    invoke.mockImplementation(async (_name, { body }) => {
      if (body.operation === 'list') return { data: { cases: openCases }, error: null };
      if (body.operation === 'get') return { data: openDetail, error: null };
      if (body.operation === 'resolve') {
        return {
          data: {
            ...openDetail,
            case: { ...openDetail.case, status: 'resolved' },
            actions: [{ id: 'action-1', action: body.action, reason: body.reason, created_at: '2026-08-26T12:00:00Z' }],
          },
          error: null,
        };
      }
      throw new Error('Unexpected operation');
    });

    render(<AdminInbox />);
    expect(await screen.findByText('Creek trail litter')).toBeTruthy();
    expect(screen.getByText('Park entrance cleanup')).toBeTruthy();
    expect(screen.getByText('Urgent')).toBeTruthy();
    expect(screen.getByText('Normal')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.queryByText('Loading inbox…')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh inbox' }));
    await waitFor(() => expect(screen.queryByText('Loading inbox…')).toBeNull());

    fireEvent.change(screen.getByLabelText('Filter case type'), { target: { value: 'dispute' } });
    expect(screen.getByText('Creek trail litter')).toBeTruthy();
    expect(screen.queryByText('Park entrance cleanup')).toBeNull();

    fireEvent.click(screen.getByText('Creek trail litter'));
    expect(await screen.findByText('Cleaner’s description')).toBeTruthy();
    expect(screen.getByText('Automated findings')).toBeTruthy();
    expect(screen.getByText('usable')).toBeTruthy();

    expect(screen.getByAltText('Before evidence 1').getAttribute('src')).toBe(
      '/api/report-photo?path=cleaner%2Freport%2Fbefore.heic&caseId=case-dispute',
    );
    expect(screen.getByText(/Compare the reporter’s concern with the complete photo set/i)).toBeTruthy();

    const decisionButton = screen.getByRole('button', { name: 'Deny dispute and continue reward process' });
    expect(decisionButton.getAttribute('disabled')).not.toBeNull();
    expect(screen.getByText('Enter at least 3 characters to enable a decision.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Why are you making this decision/i), {
      target: { value: 'The complete photo set supports the cleanup.' },
    });
    expect(decisionButton.getAttribute('disabled')).toBeNull();
    fireEvent.click(decisionButton);

    // A second, in-page confirmation replaces the browser pop-up; nothing is sent before it.
    expect(invoke).not.toHaveBeenCalledWith('admin-cleanup-case', expect.objectContaining({ body: expect.objectContaining({ operation: 'resolve' }) }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, deny dispute and continue reward process' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith(
      'admin-cleanup-case',
      { body: {
        operation: 'resolve',
        caseId: 'case-dispute',
        action: 'deny_dispute',
        reason: 'The complete photo set supports the cleanup.',
      } },
    ));
    expect(await screen.findByText(/deny dispute/i)).toBeTruthy();
    expect(screen.getByText(/The complete photo set supports the cleanup/)).toBeTruthy();
    expect(screen.getByText(/Decision recorded\. The related mobile state has been updated\./i)).toBeTruthy();
  });
});

describe('community moderation in the existing inbox', () => {
  it('shows a profile-only concern without offering to remove an unrelated report', async () => {
    const item = { ...openCases[0], id: 'moderation-1', case_type: 'user_moderation', title: 'Community report', report_id: null, report_title: null };
    invoke.mockImplementation(async (_name, { body }) => ({ error: null, data: body.operation === 'list' ? { cases: [item] } : {
      ...openDetail, case: { ...item, context: { details: 'Please review this profile.', reported_profile: { display_name: 'Test member', bio: 'Profile being reviewed' } } },
      report: null, attempt: null, photos: {},
    } }));
    render(<AdminInbox />);
    fireEvent.click(await screen.findByRole('button', { name: /Community report/ }));
    expect(await screen.findByText('Please review this profile.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove litter report' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Clear public profile content' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Profile being reviewed')).toBeTruthy();
  });
});

describe('closing a report for refunds', () => {
  const safetyCase = { id: 'case-safety', case_type: 'report_safety' } as never;
  it('is not offered once the report’s cleanup is complete, and says why', () => {
    const detail = { case: safetyCase, report: { title: 'Test', cleanup_state: 'completed' } };
    expect(availableActions(detail).map((action) => action.value)).toEqual(['approve_funding', 'reject_funding']);
    expect(closeBlockedReason(detail)).toMatch(/already complete/);
  });
  it('is offered for an open report', () => {
    const detail = { case: safetyCase, report: { title: 'Creek', cleanup_state: 'available' } };
    expect(availableActions(detail).map((action) => action.value)).toContain('close_and_refund');
    expect(closeBlockedReason(detail)).toBeNull();
  });
});

it('shows the server’s explanation instead of a generic status-code error', async () => {
  invoke.mockImplementation(async (_name, { body }) => {
    if (body.operation === 'list') return { data: { cases: openCases }, error: null };
    if (body.operation === 'get') return { data: openDetail, error: null };
    return { data: null, error: Object.assign(new Error('Edge Function returned a non-2xx status code'), { context: new Response(JSON.stringify({ error: 'The admin action could not be completed' }), { status: 500 }) }) };
  });
  render(<AdminInbox />);
  fireEvent.click(await screen.findByText('Creek trail litter'));
  await screen.findByText('Cleaner’s description');
  fireEvent.change(screen.getByLabelText(/Why are you making this decision/i), { target: { value: 'Testing the error message.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Deny dispute and continue reward process' }));
  fireEvent.click(screen.getByRole('button', { name: 'Yes, deny dispute and continue reward process' }));
  expect(await screen.findByText('The admin action could not be completed')).toBeTruthy();
  expect(screen.queryByText(/non-2xx/)).toBeNull();
});
