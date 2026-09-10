import { describe, expect, it } from 'vitest';
import { canAdvanceReportStep, resumableReportStep, nextReportStep } from './reportWizard';
const form = { photos: [], selectedTypes: [], types: '', severity: '' };
describe('five-stage report flow', () => {
  it('requires photo evidence before details while title stays optional', () => {
    expect(canAdvanceReportStep(0, { form })).toBe(false);
    expect(canAdvanceReportStep(0, { form: { ...form, photos: ['file://photo.jpg'] } })).toBe(true);
    expect(canAdvanceReportStep(0, { form, isEditing: true, existingPhotoPaths: ['existing.jpg'] })).toBe(true);
  });
  it('validates litter type and severity on their own steps', () => {
    expect(canAdvanceReportStep(1, { form: { ...form, selectedTypes: ['Plastic'] } })).toBe(true);
    expect(canAdvanceReportStep(1, { form: { ...form, severity: 'Low' } })).toBe(false);
    expect(canAdvanceReportStep(1, { form: { ...form, types: 'Foam' } })).toBe(true);
    expect(canAdvanceReportStep(2, { form })).toBe(false);
    expect(canAdvanceReportStep(2, { form: { ...form, severity: 'Low' } })).toBe(true);
    expect(canAdvanceReportStep(3, { form })).toBe(true);
  });
});

it('resumes the saved stage only when its required evidence still exists', () => {
  const draft = { workflowVersion: 2, step: 4, form: { photos: ['photo'], selectedTypes: ['Plastic'], severity: 'Low' } };
  expect(resumableReportStep(draft)).toBe(4);
  expect(resumableReportStep({ ...draft, form: { ...draft.form, photos: [] } })).toBe(0);
  expect(resumableReportStep({ ...draft, form: { ...draft.form, severity: '' } })).toBe(2);
  expect(resumableReportStep({ ...draft, step: 1 })).toBe(1);
});

it('maps old review drafts to the new review step without skipping missing answers', () => {
  const draft = { step: 2, form: { photos: ['photo'], types: 'Plastic', severity: 'Low' } };
  expect(resumableReportStep(draft)).toBe(4);
  expect(resumableReportStep({ ...draft, form: { ...draft.form, severity: '' } })).toBe(2);
  expect(resumableReportStep({ ...draft, workflowVersion: 2 })).toBe(2);
});

describe('returning from review edits', () => {
  const ready = { form: { photos: ['photo'], types: 'Cans', severity: 'Low' } };
  it('returns directly to review from each edited step', () => {
    for (const step of [0, 1, 2, 3]) expect(nextReportStep(step, ready, true)).toBe(4);
  });
  it('keeps normal forward navigation sequential', () => {
    expect(nextReportStep(0, ready)).toBe(1);
    expect(nextReportStep(2, ready)).toBe(3);
  });
  it('does not skip required answers removed during editing', () => {
    const missing = { form: { ...ready.form, types: '' } };
    expect(nextReportStep(1, missing, true)).toBe(1);
    expect(nextReportStep(3, missing, true)).toBe(1);
  });
});
