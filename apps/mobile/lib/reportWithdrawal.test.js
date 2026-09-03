import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }));

import { reportWithdrawalErrorMessage } from './reportWithdrawal';

describe('report withdrawal messages', () => {
  it('turns backend state codes into user-facing explanations', () => {
    expect(reportWithdrawalErrorMessage({ message: 'cleanup_activity_started' }))
      .toContain('already started');
    expect(reportWithdrawalErrorMessage({ message: 'report_has_funding_activity' }))
      .toContain('funding activity');
    expect(reportWithdrawalErrorMessage({ message: 'report_withdrawal_not_allowed' }))
      .toContain('no longer active');
  });

  it('does not expose an unknown database error', () => {
    expect(reportWithdrawalErrorMessage({ message: 'violates foreign key constraint' }))
      .toBe('We couldn’t withdraw this report. Check your connection and try again.');
  });
});
