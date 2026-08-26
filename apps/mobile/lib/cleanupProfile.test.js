import { describe, expect, it } from 'vitest';

import {
  cleanupApprovalLabel,
  summarizeCleanupAttempts,
} from './cleanupProfile';

describe('profile cleanup summaries', () => {
  it('derives active, awaiting-review, and completed totals from attempts', () => {
    const summary = summarizeCleanupAttempts([
      { id: 'claimed', status: 'claimed' },
      { id: 'changes', status: 'changes_requested' },
      { id: 'awaiting', status: 'completion_submitted' },
      { id: 'completed', status: 'completed' },
      { id: 'released', status: 'released' },
      { id: 'expired', status: 'expired' },
    ]);

    expect(summary.counts).toEqual({
      active: 2,
      awaitingReview: 1,
      completed: 1,
    });
    expect(summary.current.map(({ id }) => id)).toEqual([
      'claimed',
      'changes',
      'awaiting',
    ]);
    expect(summary.completed.map(({ id }) => id)).toEqual(['completed']);
  });

  it('keeps approval provenance visible for future ranking rules', () => {
    expect(cleanupApprovalLabel('self_approved')).toBe('Self cleanup');
    expect(cleanupApprovalLabel('auto_approved')).toBe('Automatically approved');
    expect(cleanupApprovalLabel('reporter_approved')).toBe('Reporter approved');
  });
});
