import type { ReportDraft } from '@litterbugs/report-contract';

type DraftContent = {
  draft: Omit<ReportDraft, 'photos'> & { photos?: readonly unknown[] };
  fundingChoice: string;
  customAmount: string;
};

/** A chosen pin or wizard step alone is not an unfinished report. */
export function hasReportDraftContent(value: DraftContent, photoCount = value.draft.photos?.length ?? 0) {
  return photoCount > 0
    || [value.draft.title, value.draft.types, value.draft.severity, value.draft.notes, value.customAmount].some(text => text.trim().length > 0)
    || value.draft.selectedTypes.length > 0
    || value.draft.selectedNotes.length > 0
    || Boolean(value.fundingChoice && value.fundingChoice !== 'none');
}
