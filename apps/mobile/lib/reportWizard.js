import { hasRequiredReportPhoto } from './reportDraft';

export function canAdvanceReportStep(step, { form, isEditing = false, existingPhotoPaths = [] }) {
  if (step === 0) return hasRequiredReportPhoto({ photoUris: form.photos || [], isEditing, existingPhotoPaths });
  if (step === 1) return Boolean(form.selectedTypes?.length || form.types?.trim());
  if (step === 2) return Boolean(form.severity);
  return true;
}

export function resumableReportStep(draft) {
  if (!draft?.form) return 0;
  let step = Math.max(0, Math.min(4, Math.floor(Number(draft.step) || 0)));
  // Old three-step drafts used index 2 for Review.
  if (draft.workflowVersion !== 2 && step >= 2) step = 4;
  for (let prior = 0; prior < step; prior += 1) {
    if (!canAdvanceReportStep(prior, draft)) return prior;
  }
  return step;
}

// Review edits can return directly once all required steps are still valid.
export function nextReportStep(step, draft, returnToReview = false) {
  if (!canAdvanceReportStep(step, draft)) return step;
  if (!returnToReview) return Math.min(4, step + 1);
  for (let required = 0; required < 3; required += 1) {
    if (!canAdvanceReportStep(required, draft)) return required;
  }
  return 4;
}
