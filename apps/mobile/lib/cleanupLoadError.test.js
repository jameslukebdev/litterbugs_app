import { expect, it } from 'vitest';
import { cleanupLoadErrorPresentation } from './cleanupLoadError';
it('offers retry only for transient context failures', () => {
  expect(cleanupLoadErrorPresentation(new Error('network error')).retryable).toBe(true);
  for (const code of ['cleanup_claim_expired', 'cleanup_correction_expired', 'cleanup_submission_not_allowed', 'cleanup_submission_invalid_state']) expect(cleanupLoadErrorPresentation(new Error(code)).retryable).toBe(false);
});
