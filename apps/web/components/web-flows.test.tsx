// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- The test mock intentionally renders a native image. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';

import { AuthDialog } from './auth-dialog';
import { ReportWizard, validateWebReportPhotos, hasRequiredWebReportPhoto } from './report-wizard';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:report-photo') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});

afterAll(() => {
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

afterEach(cleanup);

describe('web product boundaries', () => {
  it('keeps unapproved Facebook login out of the public release', () => {
    render(<AuthDialog onClose={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /continue with apple/i })).toBeNull();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /continue with facebook/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Email' }));
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /guest/i })).toBeNull();
  });

  it('keeps Facebook available for invited internal provider testing', () => {
    render(<AuthDialog onClose={vi.fn()} facebookLoginEnabled />);

    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeTruthy();
    const facebookMark = document.querySelector('.facebook-provider-icon');
    expect(facebookMark?.getAttribute('viewBox')).toBe('0 0 512 512');
    expect(facebookMark?.querySelector('path')?.getAttribute('fill')).toBe('currentColor');
    expect(facebookMark?.querySelector('path')?.getAttribute('fill-rule')).toBe('evenodd');
    expect(document.querySelector('.facebook-provider-icon-frame')).toBeNull();
  });

  it('keeps the mobile app’s five report steps and required gates', () => {
    render(
      <ReportWizard
        initialDraft={{ ...EMPTY_REPORT_DRAFT }}
        isEditing={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => null)}
      />,
    );

    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
    expect(screen.getByLabelText('Report title (optional)')).toBeTruthy();
    const photoNext = screen.getByRole('button', { name: /next/i }) as HTMLButtonElement;
    expect(photoNext.disabled).toBe(true);
    const picker = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(picker).toBeTruthy();
    fireEvent.change(picker!, {
      target: { files: [new File(['report'], 'report.jpg', { type: 'image/jpeg' })] },
    });
    expect(photoNext.disabled).toBe(false);
    fireEvent.click(photoNext);
    expect(screen.getByText('Step 2 of 5')).toBeTruthy();

    const litterNext = screen.getByRole('button', { name: /next/i }) as HTMLButtonElement;
    expect(litterNext.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Bottles' }));
    expect(litterNext.disabled).toBe(false);
    fireEvent.click(litterNext);

    expect(screen.getByText('Step 3 of 5')).toBeTruthy();
    const severityNext = screen.getByRole('button', { name: /next/i }) as HTMLButtonElement;
    expect(severityNext.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Medium/ }));
    fireEvent.click(severityNext);
    expect(screen.getByText('Step 4 of 5')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Step 5 of 5')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit report' })).toBeTruthy();
  });

  it('accepts only launch-safe report photos', () => {
    expect(validateWebReportPhotos([])).toMatch(/at least one/i);
    expect(validateWebReportPhotos([
      new File(['photo'], 'report.heic', { type: '' }),
    ])).toBe('');
    expect(validateWebReportPhotos([
      new File(['not-a-photo'], 'report.pdf', { type: 'application/pdf' }),
    ])).toMatch(/JPEG, PNG, WebP, HEIC, or HEIF/i);
  });
});

describe('report creation funding choice', () => {
  const photo = new File(['report'], 'report.jpg', { type: 'image/jpeg' });
  function review(onSubmit = vi.fn(async () => null), fundingEnabled = true) {
    render(<ReportWizard initialDraft={{ ...EMPTY_REPORT_DRAFT, photos: [photo], selectedTypes: ['Bottles'], severity: 'Low' }} isEditing={false} fundingEnabled={fundingEnabled} onClose={vi.fn()} onSubmit={onSubmit} />);
    for (let step = 0; step < 4; step++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    return onSubmit;
  }

  it('defaults to no contribution and submits no amount', () => {
    const onSubmit = review();
    expect(screen.getByRole('button', { name: 'No contribution now' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Post without paying. Others can still contribute to this cleanup.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ photos: [photo] }), null);
  });

  it('preserves the chosen amount through a review edit and passes exact cents', () => {
    const onSubmit = review();
    fireEvent.click(screen.getByRole('button', { name: '$5' }));
    expect(screen.getByText('$5.50')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit title' }));
    fireEvent.change(screen.getByLabelText('Report title (optional)'), { target: { value: 'Country road bottles' } });
    fireEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    expect(screen.getByText('Step 5 of 5')).toBeTruthy();
    expect(screen.getByRole('button', { name: '$5' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Country road bottles' }), 500);
  });

  it('rejects an invalid custom amount and lets the user switch back to no contribution', () => {
    const onSubmit = review();
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));
    fireEvent.change(screen.getByLabelText('Starting contribution amount ($)'), { target: { value: '1001' } });
    expect((screen.getByRole('button', { name: 'Submit report' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'No contribution now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), null);
  });

  it('does not offer funding when the feature is disabled', () => {
    const onSubmit = review(vi.fn(async () => null), false);
    expect(screen.queryByRole('button', { name: 'No contribution now' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), null);
  });
});

describe('editing report photos', () => {
  it('previews a replacement set, returns to the originals when removed, and submits replacements', () => {
    const onSubmit = vi.fn(async () => null);
    render(<ReportWizard initialDraft={{ ...EMPTY_REPORT_DRAFT, title: 'Existing report', selectedTypes: ['Bottles'], severity: 'Low' }} isEditing existingPhotoUrls={['https://example.test/old.jpg']} onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.getByAltText('Existing report photo 1')).toBeTruthy();
    const picker = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const photo = new File(['new'], 'new.jpg', { type: 'image/jpeg' });
    fireEvent.change(picker, { target: { files: [photo] } });
    expect(screen.getByAltText('Selected report photo 1')).toBeTruthy();
    expect(screen.queryByAltText('Existing report photo 1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    expect(screen.getByAltText('Existing report photo 1')).toBeTruthy();
    fireEvent.change(picker, { target: { files: [photo] } });
    for (let step = 0; step < 4; step++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('These photos replace the current set when saved.')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Starting contribution' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ photos: [photo] }), null);
  });
});


it('allows keeping stored photos when their temporary previews cannot load', () => {
  expect(hasRequiredWebReportPhoto({ photos: [], existingPhotoUrls: [], existingPhotoCount: 2, isEditing: true })).toBe(true);
  expect(hasRequiredWebReportPhoto({ photos: [], existingPhotoUrls: [], existingPhotoCount: 2, isEditing: false })).toBe(false);
});

it('retains the review stage, photos, title and custom funding choice while changing the pin', () => {
  const photo = new File(['photo'], 'report.jpg', { type: 'image/jpeg' });
  const initialDraft = { ...EMPTY_REPORT_DRAFT, title: 'Country road', photos: [photo], selectedTypes: ['Bottles'], severity: 'Low' as const };
  const onSubmit = vi.fn(async () => null);
  const onChangeLocation = vi.fn();
  const base = { initialDraft, isEditing: false, fundingEnabled: true, onClose: vi.fn(), onSubmit, onChangeLocation };
  const { rerender } = render(<ReportWizard {...base} coordinates={{ latitude: 36, longitude: -81 }} />);
  for (let step = 0; step < 4; step++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Other' }));
  fireEvent.change(screen.getByLabelText('Starting contribution amount ($)'), { target: { value: '12.34' } });
  fireEvent.click(screen.getByRole('button', { name: 'Change report location' }));
  expect(onChangeLocation).toHaveBeenCalledTimes(1);
  vi.mocked(URL.revokeObjectURL).mockClear();
  rerender(<ReportWizard {...base} coordinates={{ latitude: 36, longitude: -81 }} selectingLocation />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).not.toBe('hidden');
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  rerender(<ReportWizard {...base} coordinates={{ latitude: 36.1, longitude: -81.1 }} />);
  expect(screen.getByText('Step 5 of 5')).toBeTruthy();
  expect(screen.getByText('36.10000, -81.10000')).toBeTruthy();
  expect(screen.getByText('Country road')).toBeTruthy();
  expect(screen.getByAltText('Report photo 1')).toBeTruthy();
  expect((screen.getByLabelText('Starting contribution amount ($)') as HTMLInputElement).value).toBe('12.34');
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ photos: [photo], title: 'Country road' }), 1234);
});
