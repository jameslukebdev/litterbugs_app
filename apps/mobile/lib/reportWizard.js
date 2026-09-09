import { hasRequiredReportPhoto } from './reportDraft';

export function canAdvanceReportStep(step, { form, isEditing = false, existingPhotoPaths = [] }) {
  if (step === 0) return hasRequiredReportPhoto({ photoUris: form.photos || [], isEditing, existingPhotoPaths });
  if (step === 1) return Boolean((form.selectedTypes?.length || form.types?.trim()) && form.severity);
  return true;
}

export function resumableReportStep(draft) {
  if (!draft?.form || !canAdvanceReportStep(0, draft)) return 0;
  if (!canAdvanceReportStep(1, draft)) return Math.min(1, Number(draft.step) || 0);
  return Math.max(0, Math.min(2, Number(draft.step) || 0));
}
