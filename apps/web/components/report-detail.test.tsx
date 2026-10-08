// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportDetail } from './report-detail';

const createSignedUrl = vi.fn(async (path: string) => ({
  data: { signedUrl: `https://storage.example/${path}` },
  error: null,
}));

vi.mock('@/lib/prepare-browser-photo', () => ({ prepareBrowserPhotos: async (files: File[]) => files }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => { const builder = { select: () => builder, eq: () => builder, not: () => builder, order: () => builder, limit: () => builder, maybeSingle: async () => ({ data: null, error: null }) }; return builder; },
    storage: {
      from: () => ({ createSignedUrl }),
    },
  }),
}));

const report: Report = {
  is_published: true,
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
  is_sample: false,
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

beforeEach(() => {
  // Keep the active report fixture active as the calendar advances.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-01T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
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
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
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
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });

  it('offers sharing throughout a public report lifecycle', () => {
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
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();

    rerender(
      <ReportDetail
        report={{ ...report, cleanup_state: 'completed' }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Share Your Impact' })).toBeTruthy();
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
    const closeButton = screen.getByRole('button', { name: 'Back' });
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
    expect(screen.getByRole('button', { name: /Email/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Facebook/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Prepare for Instagram/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /^X/ })).toBeTruthy();

    expect(screen.getByRole('link', { name: /WhatsApp/ }).querySelector('img')?.getAttribute('src'))
      .toBe('/brand/social/whatsapp-glyph.png');
    expect(screen.getByRole('link', { name: /Facebook/ }).querySelector('img')?.getAttribute('src'))
      .toBe('/brand/social/facebook-logo.png');
    expect(screen.getByRole('button', { name: /Prepare for Instagram/ }).querySelector('img')?.getAttribute('src'))
      .toBe('/brand/social/instagram-glyph.png');
    expect(screen.getByRole('link', { name: /^X/ }).querySelector('img')?.getAttribute('src'))
      .toBe('/brand/social/x-logo.png');

    fireEvent.click(screen.getByRole('button', { name: /Email/ }));
    expect(screen.getByRole('group', { name: /Email sharing choices/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Default email app/ }).getAttribute('href')).toMatch(/^mailto:\?subject=/);
    expect(screen.getByRole('link', { name: /Gmail/ }).getAttribute('href')).toMatch(/^https:\/\/mail\.google\.com\/mail\//);
    expect(screen.getByRole('link', { name: /Outlook/ }).getAttribute('href')).toMatch(/^https:\/\/outlook\.office\.com\/mail\/deeplink\/compose/);
    fireEvent.click(screen.getByRole('button', { name: /Copy email text/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('Subject: Photo report | Litterbugs');
    expect(writeText.mock.calls[0][0]).toContain('http://localhost:3000/reports/report-id');
    expect(screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(screen.getByRole('link', { name: /Facebook/ }).getAttribute('href')).toMatch(/^https:\/\/www\.facebook\.com\/dialog\/share\?app_id=/);
    expect(screen.getByRole('link', { name: /^X/ }).getAttribute('href')).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?text=/);

    const destinationUrls = Array.from(shareDialog.querySelectorAll<HTMLAnchorElement>('a')).map(({ href }) => href).join(' ');
    expect(destinationUrls).not.toContain('35.99');
    expect(destinationUrls).not.toContain('-78.9');

    fireEvent.click(screen.getByRole('button', { name: /Copy link/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[1][0]).toBe('http://localhost:3000/reports/report-id');
    expect(screen.getByText('Link copied. Choose a destination or close this window.')).toBeTruthy();
    expect(onNotify).not.toHaveBeenCalled();
  });

  it('uses completed-impact copy in the completed report action, dialog, and native sheet', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });

    const { rerender } = render(
      <ReportDetail
        report={{ ...report, cleanup_state: 'completed' }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share Your Impact' }));
    expect(screen.getByRole('dialog', { name: 'Share your cleanup impact' })).toBeTruthy();
    expect(within(screen.getByRole('dialog', { name: 'Share your cleanup impact' })).getByText('Cleanup complete')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close share options' }));

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    rerender(
      <ReportDetail
        report={{ ...report, cleanup_state: 'completed' }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Share Your Impact' }));

    await waitFor(() => expect(nativeShare).toHaveBeenCalledWith({
      title: 'Photo report',
      text: 'See the cleanup impact for Photo report on Litterbugs.',
      url: 'http://localhost:3000/reports/report-id',
    }));
  });

  it('traps keyboard focus inside the share chooser without including the hidden download link', () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
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
    const shareDialog = screen.getByRole('dialog', { name: 'Share this cleanup report' });
    const close = screen.getByRole('button', { name: 'Close share options' });
    const last = screen.getByRole('link', { name: /^X/ });

    expect(document.activeElement).toBe(shareDialog);
    fireEvent.keyDown(shareDialog, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(shareDialog, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Copy link/ }));
    close.focus();
    fireEvent.keyDown(shareDialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(shareDialog, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
  });

  it('downloads an Instagram card and copies its prepared caption without opening an undocumented URL', async () => {
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
    const instagramButton = screen.getByRole('button', { name: /Prepare for Instagram/ });
    expect(instagramButton.textContent).toContain('Download the branded card and copy its caption');
    const downloadLink = document.querySelector<HTMLAnchorElement>('a[download]');
    expect(downloadLink?.getAttribute('href')).toBe('http://localhost:3000/reports/report-id/share-image');
    expect(downloadLink?.getAttribute('download')).toBe('litterbugs-photo-report.png');
    const download = vi.spyOn(downloadLink as HTMLAnchorElement, 'click').mockImplementation(() => undefined);
    fireEvent.click(instagramButton);

    expect(download).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/reports/report-id')));
    expect(screen.getByRole('status').textContent).toContain('Instagram card downloaded');
    expect(screen.getByRole('group', { name: /Instagram sharing instructions/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open Instagram/ }).getAttribute('href'))
      .toBe('https://www.instagram.com/');
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
      text: 'View Photo report and help clean it up with Litterbugs.',
      url: 'http://localhost:3000/reports/report-id',
    }));
    expect(screen.queryByRole('dialog', { name: 'Share this cleanup report' })).toBeNull();
    expect(onNotify).toHaveBeenCalledWith('Report shared.');
  });

  it('keeps the explicit Instagram card download separate from the device share sheet', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: /Prepare for Instagram/ }));

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
    fireEvent.click(screen.getByRole('button', { name: /Share with another app/ }));

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
    fireEvent.click(screen.getByRole('button', { name: /Share with another app/ }));

    await waitFor(() => expect(nativeShare).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog', { name: 'Share this cleanup report' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('');
  });
});

it('shows a closed historical report without inviting a new cleanup claim', () => {
  render(<ReportDetail report={{ ...report, expired_at: '2026-08-31', expires_at: '2026-08-31' }} isOwner={false} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
  expect(screen.getByText('Report closed')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Sign in to clean' })).toBeNull();
});


it('keeps photo selection and keyboard focus through data refresh and uses the latest close callback', () => {
  const initialClose = vi.fn(); const updatedClose = vi.fn();
  const props = { report: { ...report, photo_paths: ['user/report/one.jpg', 'user/report/two.jpg'] }, isOwner: false, onEdit: vi.fn(), onDelete: vi.fn() };
  const { rerender } = render(<ReportDetail {...props} onClose={initialClose} />);
  const next = screen.getByRole('button', { name: 'Next photo' });
  next.focus(); fireEvent.click(next);
  rerender(<ReportDetail {...props} report={{ ...props.report, funded_amount_cents: 2500 }} onClose={updatedClose} />);
  expect(document.activeElement).toBe(next);
  expect(screen.getByAltText('Report photo 2 of 2')).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(initialClose).not.toHaveBeenCalled(); expect(updatedClose).toHaveBeenCalledOnce();
});

it.each([false, true])('restores desktop return focus without stealing an independently moved focus (%s)', movedElsewhere => {
  const view = (open: boolean) => <>
    <button>Open report card</button>
    {open && <ReportDetail inline report={report} isOwner={false} onClose={vi.fn()} />}
    <button>Another report card</button>
  </>;
  const { rerender } = render(view(false));
  const origin = screen.getByRole('button', { name: 'Open report card' });
  origin.focus();
  rerender(view(true));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Back' }));
  const other = screen.getByRole('button', { name: 'Another report card' });
  if (movedElsewhere) other.focus();
  rerender(view(false));
  expect(document.activeElement).toBe(movedElsewhere ? other : origin);
});

it.each(['claimed', 'completion_submitted', 'changes_requested'])('does not close %s after its original expiry', state => {
  render(<ReportDetail report={{ ...report, cleanup_state: state, expires_at: '2020-01-01T00:00:00Z' }} isOwner={false} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
  expect(screen.queryByText('Report closed')).toBeNull();
});

it('does not show an upcoming expiry on a cancelled historical report', () => {
  render(<ReportDetail report={{ ...report, cancelled_at: '2026-09-01', expires_at: '2099-01-01' }} isOwner={false} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
  expect(screen.getByText('Report closed')).toBeTruthy();
  expect(screen.queryByText(/^Expires /)).toBeNull();
});
it('explains a full-photo failure even with a loaded preview and retries in place', () => {
 const onClose=vi.fn();
 const view=render(<ReportDetail report={{...report,photo_paths:['user/report/one.jpg']}} isOwner={false} onClose={onClose} onEdit={vi.fn()} onDelete={vi.fn()}/>);
 fireEvent.load(view.container.querySelector('.report-photo-preview')!);
 fireEvent.error(screen.getByAltText('Report photo 1 of 1'));
 expect(screen.getByText('Full-size photo unavailable. Preview shown.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Retry photo'}));
 const retried=screen.getByAltText('Report photo 1 of 1');
 expect(retried.getAttribute('src')).toContain('retry=1');
 fireEvent.load(retried);
 expect(screen.getByRole('button',{name:'View full photo'})).toBeTruthy();
 expect(onClose).not.toHaveBeenCalled();
});


it('retains the displayed photo and counter while another carousel image loads, including retries', () => {
  const view = render(<ReportDetail report={{ ...report, photo_paths: ['user/report/one.jpg', 'user/report/two.jpg', 'user/report/three.jpg'] }} isOwner={false} onClose={vi.fn()} />);
  const first = screen.getByAltText('Report photo 1 of 3');
  fireEvent.load(first);
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  expect(view.container.querySelector('.report-photo-retained')).toBe(first);
  expect(view.container.querySelector('.photo-count')?.textContent).toBe('1/3');
  expect(screen.queryByText('Loading photo…')).toBeNull();
  expect(view.container.querySelector('.spinner')).toBeNull();
  // A fast second click skips the pending image without clearing the displayed one.
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  fireEvent.error(screen.getByAltText('Report photo 3 of 3'));
  expect(screen.getByText('Photo could not load. Previous photo shown.')).toBeTruthy();
  expect(view.container.querySelector('.report-photo-retained')).toBe(first);
  fireEvent.click(screen.getByRole('button', { name: 'Retry photo' }));
  fireEvent.load(screen.getByAltText('Report photo 3 of 3'));
  expect(view.container.querySelector('.photo-count')?.textContent).toBe('3/3');
});

it('reuses a decoded previous photo when navigating back without waiting for another load event', () => {
  render(<ReportDetail report={{ ...report, photo_paths: ['user/report/one.jpg', 'user/report/two.jpg'] }} isOwner={false} onClose={vi.fn()} />);
  const first = screen.getByAltText('Report photo 1 of 2');
  Object.defineProperty(first, 'complete', { value: true });
  Object.defineProperty(first, 'naturalWidth', { value: 900 });
  fireEvent.load(first);
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  fireEvent.load(screen.getByAltText('Report photo 2 of 2'));
  fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
  expect(screen.getByAltText('Report photo 1 of 2')).toBe(first);
  expect(first.classList.contains('report-photo-loading')).toBe(false);
  expect(screen.getByRole('button', { name: 'View full photo' }).hasAttribute('disabled')).toBe(false);
});

it('retains the photo in the expanded viewer while the next image loads', () => {
  render(<ReportDetail report={{ ...report, photo_paths: ['user/report/one.jpg', 'user/report/two.jpg'] }} isOwner={false} onClose={vi.fn()} />);
  fireEvent.load(screen.getByAltText('Report photo 1 of 2'));
  fireEvent.click(screen.getByRole('button', { name: 'View full photo' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Next photo' }).at(-1)!);
  expect(document.querySelector('.photo-viewer-image img[aria-hidden="true"]')?.getAttribute('src')).toContain('one.jpg');
  expect(document.querySelector('.photo-viewer-current')?.classList.contains('report-photo-loading')).toBe(true);
  fireEvent.load(screen.getByAltText('Report photo 2 of 2'));
  expect(document.querySelector('.photo-viewer-current')?.classList.contains('report-photo-loading')).toBe(false);
});

it('keeps the title and original photo ahead of async completed-cleanup details', async () => {
  const view = render(<ReportDetail report={{ ...report, cleanup_state: 'completed', photo_paths: ['user/report/one.jpg'] }} isOwner={false} onClose={vi.fn()} />);
  expect(view.container.querySelector('.report-detail-header .completed-cleanup-story')).toBeNull();
  expect(screen.getByText('Loading cleanup details…').classList.contains('sr-only')).toBe(true);
  expect(view.container.querySelector('.completed-cleanup-story')).toBeNull();
  await screen.findByText('Cleanup details unavailable.');
  const photo = view.container.querySelector('.report-detail-visual')!;
  const story = view.container.querySelector('.completed-cleanup-story')!;
  expect(photo.compareDocumentPosition(story) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

describe('mobile report sheet dismissal', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => ({ matches: query === '(max-width: 700px)' })) });
  });

  function openSheet() {
    const onClose = vi.fn();
    render(<ReportDetail report={report} isOwner={false} onClose={onClose} />);
    return { onClose, panel: screen.getByRole('dialog'), handle: screen.getByRole('button', { name: 'Close report and return to map' }) };
  }

  function swipe(target: Element, x: number, y: number, endX: number, endY: number, cancel = false) {
    fireEvent.touchStart(target, { touches: [{ clientX: x, clientY: y }] });
    fireEvent.touchMove(target, { touches: [{ clientX: endX, clientY: endY }] });
    fireEvent(target, new Event(cancel ? 'touchcancel' : 'touchend', { bubbles: true }));
  }

  it('focuses the handle and offers a tap alternative to the gesture', () => {
    const { handle, onClose } = openSheet();
    expect(document.activeElement).toBe(handle);
    fireEvent.click(handle);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('follows a downward drag and dismisses after the slide-out', () => {
    vi.useFakeTimers();
    const { panel, handle, onClose } = openSheet();
    fireEvent.touchStart(handle, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(handle, { touches: [{ clientX: 105, clientY: 220 }] });
    expect(panel.style.getPropertyValue('--sheet-drag-y')).toBe('120px');
    fireEvent.touchEnd(handle);
    fireEvent.click(handle); // A synthesized click after dragging must not close twice.
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    ['short drag', 100, 140, false],
    ['horizontal swipe', 240, 120, false],
    ['upward scroll', 100, 0, false],
    ['cancelled drag', 100, 240, true],
  ])('does not dismiss for a %s', (_name, x, y, cancel) => {
    vi.useFakeTimers();
    const { panel, handle, onClose } = openSheet();
    swipe(handle, 100, 100, x as number, y as number, cancel as boolean);
    vi.advanceTimersByTime(250);
    expect(onClose).not.toHaveBeenCalled();
    expect(panel.style.getPropertyValue('--sheet-drag-y')).toBe('');
  });

  it('preserves content scrolling below the top, but dismisses from content at the top', () => {
    vi.useFakeTimers();
    const { panel, onClose } = openSheet();
    const content = panel.querySelector('.report-detail-layout') as HTMLElement;
    const heading = screen.getByRole('heading', { name: 'Photo report' });
    content.scrollTop = 100;
    swipe(heading, 100, 100, 100, 250);
    vi.advanceTimersByTime(250);
    expect(onClose).not.toHaveBeenCalled();
    content.scrollTop = 0;
    swipe(heading, 100, 100, 100, 250);
    vi.advanceTimersByTime(250);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not take over action buttons, desktop reports, or embedded reports', () => {
    vi.useFakeTimers();
    const { handle, onClose } = openSheet();
    swipe(screen.getByRole('button', { name: 'Share' }), 100, 100, 100, 250);
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false })) });
    swipe(handle, 100, 100, 100, 250);
    vi.advanceTimersByTime(250);
    expect(onClose).not.toHaveBeenCalled();
    cleanup();
    render(<ReportDetail embedded report={report} isOwner={false} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Close report and return to map' })).toBeNull();
  });
});
