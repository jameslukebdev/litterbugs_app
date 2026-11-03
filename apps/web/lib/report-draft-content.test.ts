import { expect, it } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';
import { hasReportDraftContent } from './report-draft-content';
const blank = () => ({ draft: { ...EMPTY_REPORT_DRAFT }, fundingChoice: 'none', customAmount: '' });
it('does not count a pin, a step, or whitespace as report content', () => {
  expect(hasReportDraftContent({ ...blank(), draft: { ...EMPTY_REPORT_DRAFT, title: '  ', notes: '\n' } })).toBe(false);
});
it.each([
  { title: 'A title' }, { types: 'Other litter' }, { severity: 'Low' as const },
  { notes: 'Site notes' }, { selectedTypes: ['Bottles'] }, { selectedNotes: ['Along trail'] },
  { photos: [{}] },
])('preserves a draft containing %j', fields => {
  expect(hasReportDraftContent({ ...blank(), draft: { ...EMPTY_REPORT_DRAFT, ...fields } })).toBe(true);
});
it('counts cloud photo paths and contribution selections as real draft content', () => {
  expect(hasReportDraftContent(blank(), 1)).toBe(true);
  expect(hasReportDraftContent({ ...blank(), fundingChoice: '5' })).toBe(true);
  expect(hasReportDraftContent({ ...blank(), customAmount: '12.34' })).toBe(true);
});
