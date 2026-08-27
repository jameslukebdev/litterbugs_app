// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminInbox } from './admin-inbox';

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
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AdminInbox />);
    expect(await screen.findByText('Creek trail litter')).toBeTruthy();
    expect(screen.getByText('Park entrance cleanup')).toBeTruthy();
    expect(screen.getByText('Urgent')).toBeTruthy();
    expect(screen.getByText('Normal')).toBeTruthy();

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

    fireEvent.click(screen.getByRole('button', { name: 'Deny dispute and continue reward process' }));
    expect(await screen.findByText('Add a short decision reason first.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Why are you making this decision?'), {
      target: { value: 'The complete photo set supports the cleanup.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Deny dispute and continue reward process' }));

    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
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
    expect(screen.getByText('Decision recorded.')).toBeTruthy();
  });
});
