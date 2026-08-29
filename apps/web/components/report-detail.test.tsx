// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportDetail } from './report-detail';

const createSignedUrl = vi.fn(async (path: string) => ({
  data: { signedUrl: `https://storage.example/${path}` },
  error: null,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({ createSignedUrl }),
    },
  }),
}));

const report: Report = {
  cancelled_at: null,
  cleanup_state: 'available',
  created_at: '2026-08-21T12:00:00.000Z',
  expired_at: null,
  expires_at: '2026-09-20T12:00:00.000Z',
  funded_amount_cents: 0,
  funding_eligibility: 'pending',
  funding_frozen_at: null,
  funding_hold_reason: null,
  funding_locked_at: null,
  id: 'report-id',
  latitude: 35.99,
  litter_types: ['Bottles'],
  longitude: -78.9,
  notes_other: null,
  notes_presets: null,
  original_photo_reviewed_at: null,
  photo_paths: null,
  renewal_decision_due_at: null,
  renewal_status: 'active',
  severity: 'High',
  status: 'active',
  title: 'Photo report',
  types: null,
  user_id: 'user-id',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
});

describe('ReportDetail photos', () => {
  it('uses the compatibility endpoint for an HEIC photo without changing Storage', async () => {
    render(
      <ReportDetail
        report={{ ...report, photo_paths: ['user/report/photo.heic'] }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const image = await screen.findByAltText('Report photo 1 of 1');
    expect(image.getAttribute('src')).toBe('/api/report-photo?path=user%2Freport%2Fphoto.heic&variant=detail');
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('starts the optimized current photo immediately and advances without a signing waterfall', async () => {
    render(
      <ReportDetail
        report={{ ...report, photo_paths: ['user/report/one.jpg', 'user/report/two.png'] }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByAltText('Report photo 1 of 2').getAttribute('src')).toBe(
      '/api/report-photo?path=user%2Freport%2Fone.jpg&variant=detail',
    );
    expect(createSignedUrl).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByAltText('Report photo 2 of 2').getAttribute('src')).toBe(
      '/api/report-photo?path=user%2Freport%2Ftwo.png&variant=detail',
    );
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('does not offer ordinary edit or delete controls after funding locks a report', () => {
    render(
      <ReportDetail
        report={{ ...report, funding_locked_at: '2026-08-26T12:00:00.000Z' }}
        isOwner
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Back to search' })).toBeTruthy();
  });

  it('shows the cleaner-facing reward and cleanup status', () => {
    render(
      <ReportDetail
        report={{ ...report, funded_amount_cents: 12500, cleanup_state: 'claimed' }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('$125.00 reward')).toBeTruthy();
    expect(screen.getByText('Cleanup in progress')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
  });

  it('offers sharing only for public available and completed reports', () => {
    const { rerender } = render(
      <ReportDetail
        report={report}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();

    rerender(
      <ReportDetail
        report={{ ...report, cleanup_state: 'completion_submitted' }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();

    rerender(
      <ReportDetail
        report={{ ...report, cleanup_state: 'completed' }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });

  it('opens as a modal, focuses close, and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <ReportDetail
        report={report}
        isOwner={false}
        onClose={onClose}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Photo report' });
    const closeButton = screen.getByRole('button', { name: 'Back to search' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(document.querySelector('.report-detail-backdrop') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('opens a destination chooser on desktop and copies only after Copy link is selected', async () => {
    const onFavoriteChange = vi.fn();
    const onHiddenChange = vi.fn();
    const onNotify = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });

    render(
      <ReportDetail
        report={report}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onFavoriteChange={onFavoriteChange}
        onHiddenChange={onHiddenChange}
        onNotify={onNotify}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Favorite' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(onFavoriteChange).toHaveBeenCalledWith(true);
    expect(onHiddenChange).toHaveBeenCalledWith(true);
    expect(writeText).not.toHaveBeenCalled();

    const shareDialog = screen.getByRole('dialog', { name: 'Share this cleanup report' });
    expect(shareDialog).toBeTruthy();
    expect(screen.getByRole('link', { name: /Email/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Text message/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Facebook/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Instagram/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /^X/ })).toBeTruthy();

    expect(screen.getByRole('link', { name: /WhatsApp/ }).querySelector('img')?.getAttribute('src'))
      .toBe('/brand/social/whatsapp-glyph.png');
    expect(screen.getByRole('link', { name: /Facebook/ }).querySelector('img')?.getAttribute('src'))
      .toBe('/brand/social/facebook-logo.png');
    expect(screen.getByRole('link', { name: /Instagram/ }).querySelector('img')?.getAttribute('src'))
      .toBe('/brand/social/instagram-glyph.png');
    expect(screen.getByRole('link', { name: /^X/ }).querySelector('img')?.getAttribute('src'))
      .toBe('/brand/social/x-logo.png');

    expect(screen.getByRole('link', { name: /Email/ }).getAttribute('href')).toMatch(/^mailto:\?subject=/);
    expect(screen.getByRole('link', { name: /Text message/ }).getAttribute('href')).toMatch(/^sms:\?body=/);
    expect(screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(screen.getByRole('link', { name: /Facebook/ }).getAttribute('href')).toMatch(/^https:\/\/www\.facebook\.com\/dialog\/share\?app_id=/);
    expect(screen.getByRole('link', { name: /Instagram/ }).getAttribute('href')).toBe('https://www.instagram.com/create/select/');
    expect(screen.getByRole('link', { name: /^X/ }).getAttribute('href')).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?text=/);

    const destinationUrls = Array.from(shareDialog.querySelectorAll<HTMLAnchorElement>('a')).map(({ href }) => href).join(' ');
    expect(destinationUrls).not.toContain('35.99');
    expect(destinationUrls).not.toContain('-78.9');

    fireEvent.click(screen.getByRole('button', { name: /Copy link/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toBe('http://localhost:3000/reports/report-id');
    expect(screen.getByText('Link copied. Choose a destination or close this window.')).toBeTruthy();
    expect(onNotify).not.toHaveBeenCalled();
  });

  it('opens Instagram directly with a prepared caption instead of the device share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });

    render(
      <ReportDetail
        report={report}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    const instagramLink = screen.getByRole('link', { name: /Instagram/ });
    expect(instagramLink.textContent).toContain('Open Create with a branded image and caption');
    expect(instagramLink.getAttribute('href')).toBe('https://www.instagram.com/create/select/');
    expect(instagramLink.getAttribute('target')).toBe('_blank');
    const downloadLink = document.querySelector<HTMLAnchorElement>('a[download]');
    expect(downloadLink?.getAttribute('href')).toBe('http://localhost:3000/reports/report-id/share-image');
    expect(downloadLink?.getAttribute('download')).toBe('litterbugs-photo-report.png');
    const download = vi.spyOn(downloadLink as HTMLAnchorElement, 'click').mockImplementation(() => undefined);
    fireEvent.click(instagramLink);

    expect(download).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/reports/report-id')));
    expect(screen.getByRole('status').textContent).toContain('Instagram Create is opening');
  });

  it('uses the native share sheet directly on coarse-pointer devices', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const onNotify = vi.fn();
    Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });

    render(
      <ReportDetail
        report={report}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onNotify={onNotify}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(nativeShare).toHaveBeenCalledWith({
      title: 'Photo report',
      text: 'View this cleanup report on Litterbugs.',
      url: 'http://localhost:3000/reports/report-id',
    }));
    expect(screen.queryByRole('dialog', { name: 'Share this cleanup report' })).toBeNull();
    expect(onNotify).toHaveBeenCalledWith('Report shared.');
  });

  it('keeps Instagram destination-specific even when native sharing is available', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });

    render(
      <ReportDetail
        report={report}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    const downloadLink = document.querySelector<HTMLAnchorElement>('a[download]');
    vi.spyOn(downloadLink as HTMLAnchorElement, 'click').mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('link', { name: /Instagram/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(nativeShare).not.toHaveBeenCalled();
  });

  it('includes the branded report image in the device share menu when file sharing is supported', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const fetchImage = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['image'], { type: 'image/png' }),
    });
    vi.stubGlobal('fetch', fetchImage);
    Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });

    render(
      <ReportDetail
        report={report}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(canShare).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /More apps/ }));

    await waitFor(() => expect(nativeShare).toHaveBeenCalledTimes(1));
    expect(fetchImage).toHaveBeenCalledWith('http://localhost:3000/reports/report-id/share-image');
    expect(nativeShare).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Photo report',
      url: 'http://localhost:3000/reports/report-id',
      files: [expect.objectContaining({ name: 'litterbugs-photo-report.png', type: 'image/png' })],
    }));
  });

  it('keeps the chooser open when the native share sheet is cancelled', async () => {
    const nativeShare = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });

    render(
      <ReportDetail
        report={report}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: /More apps/ }));

    await waitFor(() => expect(nativeShare).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog', { name: 'Share this cleanup report' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
