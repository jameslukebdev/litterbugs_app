const pendingWorkflows = new Map();
let workflowSequence = 0;

export const PAYOUT_WORKFLOW_KIND = Object.freeze({
  CLEANUP_CLAIM: 'cleanup_claim',
});

export function isPayoutConnectionReady(status) {
  return status?.payoutsEnabled === true;
}

export function cleanupClaimRequiresPayoutSetup(report) {
  return Number(report?.funded_amount_cents ?? 0) > 0;
}

export async function waitForPayoutConnection(
  loadStatus,
  {
    maxAttempts = 12,
    delayMs = 1000,
    wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {}
) {
  let latestStatus = null;
  let latestError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      latestStatus = await loadStatus();
      latestError = null;
      if (isPayoutConnectionReady(latestStatus)) return latestStatus;
    } catch (error) {
      latestError = error;
    }

    if (attempt < maxAttempts - 1) await wait(delayMs);
  }

  if (!latestStatus && latestError) throw latestError;
  return latestStatus;
}

export function createPayoutWorkflow(action) {
  workflowSequence += 1;
  const token = `payout-workflow-${Date.now()}-${workflowSequence}`;
  pendingWorkflows.set(token, { action, status: 'pending' });
  return token;
}

export function markPayoutWorkflowReady(token) {
  const workflow = pendingWorkflows.get(token);
  if (!workflow || workflow.status !== 'pending') return false;
  pendingWorkflows.set(token, { ...workflow, status: 'ready' });
  return true;
}

export function cancelPayoutWorkflow(token) {
  const workflow = pendingWorkflows.get(token);
  if (!workflow || workflow.status !== 'pending') return false;
  pendingWorkflows.set(token, { ...workflow, status: 'cancelled' });
  return true;
}

export function consumePayoutWorkflow(token) {
  const workflow = pendingWorkflows.get(token);
  if (!workflow || workflow.status === 'pending') return null;
  pendingWorkflows.delete(token);
  return workflow;
}

export function payoutWorkflowCopy(kind) {
  switch (kind) {
    case PAYOUT_WORKFLOW_KIND.CLEANUP_CLAIM:
      return {
        title: 'Connect Stripe before claiming',
        text: 'This cleanup has a monetary reward. Finish individual payout setup before Litterbugs reserves it for you. Volunteer cleanups do not require Stripe.',
      };
    default:
      return null;
  }
}
