import { hasRequiredReportPhoto } from './reportDraft';

export function canAdvanceReportStep(step, { form, isEditing = false, existingPhotoPaths = [] }) {
  if (step === 0) return hasRequiredReportPhoto({ photoUris: form.photos || [], isEditing, existingPhotoPaths });
  if (step === 1) return Boolean((form.selectedTypes?.length || form.types?.trim()) && form.severity);
  return true;
}
