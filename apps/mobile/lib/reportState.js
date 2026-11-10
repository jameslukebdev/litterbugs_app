import { reportPresentation } from './reportPresentation';
import { colors } from './theme';

// Same labels, bugs and inks as the website's report cards and share card.
export function reportStatePresentation(report) {
  const state = report?.cleanup_state;
  if (state === 'completed') {
    return { label: 'Cleaned up', bug: 'flower', ink: colors.done, tone: 'done' };
  }
  if (['claimed', 'completion_submitted', 'changes_requested'].includes(state)) {
    return {
      label: state === 'completion_submitted' ? 'Awaiting review' : 'Being cleaned',
      bug: 'caterpillar',
      ink: colors.beingCleaned,
      tone: 'busy',
    };
  }
  if (report?.cancelled_at || report?.expired_at) {
    return { label: reportPresentation(report).status, bug: null, ink: colors.expired, tone: 'closed' };
  }
  return { label: 'Needs a cleanup', bug: 'ladybug', ink: colors.needsCleanup, tone: 'open' };
}
