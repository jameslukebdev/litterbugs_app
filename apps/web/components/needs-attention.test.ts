import { expect, it } from 'vitest';
import type { Report } from '@litterbugs/report-contract';
import { attentionItems } from './needs-attention';
const report = { id: 'r', title: 'Roadside', cleanup_state: 'completion_submitted', cancelled_at: null, expired_at: null, expires_at: '2026-01-01' } as Report;
const attempt = { id: 'a', report_id: 'r', report: { title: 'Roadside' }, status: 'changes_requested', claim_expires_at: '2026-10-03T12:00:00Z', correction_due_at: '2026-10-02T12:00:00Z', payout_status: 'pending', is_paid: false };
it('shows correction deadlines and pending review separately without implying a reward was paid', () => {
  const items = attentionItems([report], [], [attempt], Date.parse('2026-10-01'));
  expect(items.map(item => item.action)).toEqual(['Continue cleanup', 'Review cleanup']);
  expect(items[0].due).toBe(attempt.correction_due_at);
  expect(JSON.stringify(items)).not.toContain('Reward sent');
});
it('does not request review for a closed report or renew an expired decision', () => {
  expect(attentionItems([{ ...report, cancelled_at: '2026-10-01' }], [{ ...report, renewal_status: 'decision_required', renewal_decision_due_at: '2026-09-01' }], [], Date.parse('2026-10-01'))).toEqual([]);
});
it('explains an elapsed claim and only flags payout failure when the record says failed', () => {
  const items = attentionItems([], [], [{ ...attempt, status: 'claimed', claim_expires_at: '2026-09-01', payout_status: 'failed' }], Date.parse('2026-10-01'));
  expect(items[0].reason).toContain('deadline has passed');
  expect(items[1].href).toBe('/account/connect');
  expect(attentionItems([], [], [{ ...attempt, status: 'completed', payout_status: 'transferred' }])).toEqual([]);
});
