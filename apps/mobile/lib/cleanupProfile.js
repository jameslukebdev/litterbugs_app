const ACTIVE_CLEANUP_STATUSES = new Set(['claimed', 'changes_requested']);

export const emptyCleanupSummary = () => ({
  current: [],
  active: [],
  awaitingReview: [],
  completed: [],
  counts: {
    active: 0,
    awaitingReview: 0,
    completed: 0,
  },
});

export const summarizeCleanupAttempts = (attempts = []) => {
  const current = attempts.filter(({ status }) => (
    ACTIVE_CLEANUP_STATUSES.has(status) || status === 'completion_submitted'
  ));
  const active = current.filter(({ status }) => ACTIVE_CLEANUP_STATUSES.has(status));
  const awaitingReview = current.filter(({ status }) => status === 'completion_submitted');
  const completed = attempts.filter(({ status }) => status === 'completed');

  return {
    current,
    active,
    awaitingReview,
    completed,
    counts: {
      active: active.length,
      awaitingReview: awaitingReview.length,
      completed: completed.length,
    },
  };
};

export const cleanupApprovalLabel = (approvalMethod) => {
  if (approvalMethod === 'self_approved') return 'Self cleanup';
  if (approvalMethod === 'auto_approved') return 'Automatically approved';
  return 'Reporter approved';
};
