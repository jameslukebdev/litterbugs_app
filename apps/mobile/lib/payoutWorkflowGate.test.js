import { describe, expect, it, vi } from 'vitest';

import {
  PAYOUT_WORKFLOW_KIND,
  cancelPayoutWorkflow,
  cleanupClaimRequiresPayoutSetup,
  consumePayoutWorkflow,
  createPayoutWorkflow,
  isPayoutConnectionReady,
  markPayoutWorkflowReady,
  payoutWorkflowCopy,
  waitForPayoutConnection,
} from './payoutWorkflowGate';

describe('Stripe payout workflow gate', () => {
  it('requires Stripe to explicitly enable payouts', () => {
    expect(isPayoutConnectionReady(null)).toBe(false);
    expect(isPayoutConnectionReady({ payoutsEnabled: false })).toBe(false);
    expect(isPayoutConnectionReady({ payoutsEnabled: true })).toBe(true);
  });

  it('requires payout setup only for funded cleanup claims', () => {
    expect(cleanupClaimRequiresPayoutSetup(null)).toBe(false);
    expect(cleanupClaimRequiresPayoutSetup({ funded_amount_cents: 0 })).toBe(false);
    expect(cleanupClaimRequiresPayoutSetup({ funded_amount_cents: 1 })).toBe(true);
    expect(cleanupClaimRequiresPayoutSetup({ funded_amount_cents: 12500 })).toBe(true);
  });

  it('waits for Stripe to confirm payout readiness after onboarding returns', async () => {
    const statuses = [
      { payoutsEnabled: false },
      { payoutsEnabled: false },
      { payoutsEnabled: true },
    ];
    const loadStatus = vi.fn(async () => statuses.shift());
    const wait = vi.fn(async () => undefined);

    await expect(waitForPayoutConnection(loadStatus, { wait })).resolves.toEqual({
      payoutsEnabled: true,
    });
    expect(loadStatus).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it('resumes a workflow only after setup is confirmed', () => {
    const action = { kind: PAYOUT_WORKFLOW_KIND.CLEANUP_CLAIM, reportId: 'report-1' };
    const token = createPayoutWorkflow(action);

    expect(consumePayoutWorkflow(token)).toBeNull();
    expect(markPayoutWorkflowReady(token)).toBe(true);
    expect(consumePayoutWorkflow(token)).toEqual({ action, status: 'ready' });
    expect(consumePayoutWorkflow(token)).toBeNull();
  });

  it('preserves cancellation without executing the action', () => {
    const action = { kind: PAYOUT_WORKFLOW_KIND.CLEANUP_CLAIM, reportId: 'report-1' };
    const token = createPayoutWorkflow(action);

    expect(cancelPayoutWorkflow(token)).toBe(true);
    expect(markPayoutWorkflowReady(token)).toBe(false);
    expect(consumePayoutWorkflow(token)).toEqual({ action, status: 'cancelled' });
  });

  it('provides specific onboarding copy for every gated action', () => {
    Object.values(PAYOUT_WORKFLOW_KIND).forEach((kind) => {
      expect(payoutWorkflowCopy(kind)).toMatchObject({
        title: expect.any(String),
        text: expect.any(String),
      });
    });
  });
});
