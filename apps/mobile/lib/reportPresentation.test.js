import { expect, it } from 'vitest';
import { reportPresentation } from './reportPresentation';
it.each(['available','claimed','completion_submitted','changes_requested'])('labels zero-funded %s reports as volunteer opportunities', cleanup_state => {
  expect(reportPresentation({ cleanup_state, funded_amount_cents: 0 }).funding).toBe('Volunteer');
  expect(reportPresentation({ cleanup_state, funded_amount_cents: 600 }).funding).toBe('Cleanup reward $6.00');
});
it('does not advertise available money on completed reports', () => {
  expect(reportPresentation({ cleanup_state: 'completed', funded_amount_cents: 600 }).funding).toBe('Cleanup approved');
});
it('distinguishes active lifecycle states', () => {
  const states = ['claimed', 'completion_submitted', 'changes_requested'].map(cleanup_state => reportPresentation({cleanup_state}).status);
  expect(new Set(states).size).toBe(3);
});
