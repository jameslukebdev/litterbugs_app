import { describe, expect, it } from 'vitest';
import { canAdvanceReportStep, resumableReportStep } from './reportWizard';
const form = { photos: [], selectedTypes: [], types: '', severity: '' };
describe('three-stage report flow', () => {
  it('requires photo evidence before details while title stays optional', () => {
    expect(canAdvanceReportStep(0, { form })).toBe(false);
    expect(canAdvanceReportStep(0, { form: { ...form, photos: ['file://photo.jpg'] } })).toBe(true);
    expect(canAdvanceReportStep(0, { form, isEditing: true, existingPhotoPaths: ['existing.jpg'] })).toBe(true);
  });
  it('requires both litter type and severity before review', () => {
    expect(canAdvanceReportStep(1, { form: { ...form, selectedTypes: ['Plastic'] } })).toBe(false);
    expect(canAdvanceReportStep(1, { form: { ...form, severity: 'Low' } })).toBe(false);
    expect(canAdvanceReportStep(1, { form: { ...form, types: 'Foam', severity: 'Low' } })).toBe(true);
  });
});

it('resumes the saved stage only when its required evidence still exists', () => {
  const draft = { step: 2, form: { photos: ['photo'], selectedTypes: ['Plastic'], severity: 'Low' } };
  expect(resumableReportStep(draft)).toBe(2);
  expect(resumableReportStep({ ...draft, form: { ...draft.form, photos: [] } })).toBe(0);
  expect(resumableReportStep({ ...draft, form: { ...draft.form, severity: '' } })).toBe(1);
  expect(resumableReportStep({ ...draft, step: 1 })).toBe(1);
});
