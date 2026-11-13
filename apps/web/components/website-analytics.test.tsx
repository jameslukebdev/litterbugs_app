// @vitest-environment jsdom
import { useEffect } from 'react';
import Link from 'next/link';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WebsiteAnalytics, AnalyticsPreferences } from './website-analytics';
import { WORKFLOW_VERSION, ANALYTICS_CONSENT_KEY, ANALYTICS_EVENT, ANALYTICS_PREFERENCES } from '@/lib/website-analytics';

const mock = vi.hoisted(() => ({ allowed: false, googleReady: true, path: '/', init: vi.fn(), capture: vi.fn(), optOut: vi.fn(), optIn: vi.fn(), scriptMount: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => mock.path }));
vi.mock('@/lib/website-analytics', async importOriginal => ({
  ...await importOriginal<object>(), analyticsAllowed: () => mock.allowed,
}));
vi.mock('posthog-js', () => ({ default: { init: mock.init, capture: mock.capture, opt_out_capturing: mock.optOut, opt_in_capturing: mock.optIn } }));
vi.mock('next/script', () => ({ default: function FakeScript({ onReady }: { onReady: () => void }) {
  mock.scriptMount();
  useEffect(() => { if (mock.googleReady) onReady(); }, [onReady]);
  return <div data-testid="google-script" />;
} }));
const config = { enabled: true, production: true, gaId: 'G-TEST', posthogKey: 'phc_test', posthogHost: 'https://us.i.posthog.com' };

it('excludes admin analytics and staff browser use before any provider mounts', async () => {
  mock.allowed = true; mock.path = '/admin/analytics';
  render(<WebsiteAnalytics config={{ ...config, clarityId: 'z60itnrbpn' }} />);
  await waitFor(() => expect(localStorage.getItem('litterbugs:analytics-consent:v1')).toBe('declined'));
  expect(mock.init).not.toHaveBeenCalled();
  expect(mock.capture).not.toHaveBeenCalled();
  expect(mock.scriptMount).not.toHaveBeenCalled();
  expect(document.querySelector('script[src*="clarity.ms/tag/"]')).toBeNull();
});
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value), clear: () => storage.clear() });
  vi.clearAllMocks(); mock.allowed = false; mock.googleReady = true; mock.path = '/';
});
it('records PostHog page views even when Google does not load', async () => {
  mock.allowed = true; mock.googleReady = false;
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted'); localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'accepted');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/' }));
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals();
  mock.scriptMount.mockReset();
  document.querySelectorAll('script[src*="clarity.ms/tag/"]').forEach(script => script.remove());
  delete (window as unknown as { clarity?: unknown }).clarity;
  delete (window as unknown as { gtag?: unknown }).gtag;
  delete (window as unknown as { dataLayer?: unknown }).dataLayer;
});
it('loads analytics without a pop-up and keeps regional consent defaults', async () => {
  mock.allowed = true;
  const gtag = vi.fn();
  Object.defineProperty(window, 'gtag', { configurable: true, value: gtag });
  let configuredBeforeScript = false;
  mock.scriptMount.mockImplementation(() => { configuredBeforeScript = gtag.mock.calls.some(([cmd, , params]) => cmd === 'config' && params.send_page_view === false); });
  render(<><WebsiteAnalytics config={{ ...config, clarityId: 'z60itnrbpn' }} /><AnalyticsPreferences /></>);
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/' }));
  expect(screen.queryByRole('heading', { name: 'Analytics settings' })).toBeNull();
  expect(screen.queryByTestId('google-script')).not.toBeNull();
  expect(configuredBeforeScript).toBe(true);
  expect(gtag).toHaveBeenCalledWith('set', 'send_page_view', false);
  expect(document.querySelector('script[src="https://www.clarity.ms/tag/z60itnrbpn"]')).not.toBeNull();
  expect(gtag).toHaveBeenCalledWith('consent', 'default', expect.objectContaining({
    analytics_storage: 'denied', region: expect.arrayContaining(['GB', 'CH', 'FR']),
  }));
  expect(gtag.mock.calls.some(([command, action]) => command === 'consent' && action === 'update')).toBe(false);
  const clarity = (window as unknown as { clarity: { q?: unknown[][] } }).clarity;
  expect(clarity.q ?? []).not.toContainEqual(['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }]);
  fireEvent.click(screen.getByText('Analytics choices'));
  expect(screen.getByRole('heading', { name: 'Analytics settings' })).toBeTruthy();
});
it('collects cookieless pageviews while preserving required ingestion properties', async () => {
  mock.allowed = true;
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/' }));
  const options = mock.init.mock.calls[0][1];
  expect(options.cookieless_mode).toBe('always');
  const event = options.before_send({ properties: { '$cookieless_mode': true, '$raw_user_agent': 'agent', '$host': 'litterbugs.app', distinct_id: '$posthog_cookieless', private_data: 'secret' } });
  expect(event.properties.$cookieless_mode).toBe(true);
  expect(event.properties.$raw_user_agent).toBe('agent');
  expect(event.properties.$host).toBe('litterbugs.app');
  const attribution = mock.init.mock.calls[0][1].before_send({ properties: { '$device_type': 'Desktop', '$browser': 'Chrome', '$os': 'Mac OS X' } });
  expect(attribution.properties.$device_type).toBe('Desktop');
  expect(attribution.properties.$browser).toBe('Chrome');
  expect(attribution.properties.$referring_domain).toBe('$direct');
  expect(event.properties.private_data).toBeUndefined();
  expect(screen.queryByTestId('google-script')).not.toBeNull();
});

it('keeps only safe shared-report sign-in dimensions in PostHog', async () => {
  mock.allowed = true;
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.init).toHaveBeenCalled());
  const sanitize = mock.init.mock.calls[0][1].before_send;
  const event = sanitize({
    event: 'shared_report_sign_in',
    properties: { stage: 'attempted', provider: 'google', page_type: '/reports/detail', report_id: 'private', email: 'private@example.com' },
  });
  expect(event.properties).toMatchObject({ stage: 'attempted', provider: 'google', $pathname: '/reports/detail' });
  expect(event.properties).not.toHaveProperty('email');
  expect(event.properties).not.toHaveProperty('report_id');
  expect(sanitize({ event: 'shared_report_sign_in', properties: { stage: 'attempted', provider: 'private@example.com' } })).toBeNull();
});
it('sends a consent signal only after an explicit analytics choice', async () => {
  mock.allowed = true;
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted');
  const gtag = vi.fn();
  Object.defineProperty(window, 'gtag', { configurable: true, value: gtag });
  render(<WebsiteAnalytics config={{ ...config, clarityId: 'z60itnrbpn' }} />);
  expect(document.querySelector('script[src="https://www.clarity.ms/tag/z60itnrbpn"]')).not.toBeNull();
  const clarity = (window as unknown as { clarity: { q?: unknown[][] } }).clarity;
  expect(clarity.q ?? []).toEqual([]);
  act(() => window.dispatchEvent(new Event(ANALYTICS_PREFERENCES)));
  fireEvent.click(screen.getByText('Allow analytics'));
  expect(localStorage.getItem('litterbugs:analytics-replay-consent:v1')).toBe('accepted');
  await waitFor(() => expect(clarity.q).toContainEqual(['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }]));
  expect(gtag).toHaveBeenCalledWith('consent', 'update', expect.objectContaining({ analytics_storage: 'granted' }));
});
it('does not initialize either provider in local/preview environments even with saved consent', () => {
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted'); localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'accepted');
  render(<><WebsiteAnalytics config={{ ...config, clarityId: 'test123' }} /><AnalyticsPreferences /></>);
  fireEvent.click(screen.getByText('Analytics choices'));
  expect(screen.getByText(/Optional usage tracking is off/)).toBeTruthy();
  expect(screen.queryByTestId('google-script')).toBeNull();
  expect(mock.init).not.toHaveBeenCalled();
});
it('honors a saved decline and does not load analytics providers', async () => {
  mock.allowed = true;
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'declined');
  localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'declined');
  render(<WebsiteAnalytics config={{ ...config, clarityId: 'z60itnrbpn' }} />);
  await act(async () => {});
  expect(screen.queryByTestId('google-script')).toBeNull();
  expect(document.querySelector('script[src*="clarity.ms/tag/"]')).toBeNull();
  expect(mock.init).not.toHaveBeenCalled();
});
it('deduplicates confirmed outcomes without sending IDs', async () => {
  mock.allowed = true;
  render(<WebsiteAnalytics config={config} />);
  act(() => window.dispatchEvent(new Event(ANALYTICS_PREFERENCES)));
  fireEvent.click(screen.getByText('Allow analytics'));
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/' }));
  const dispatch = () => window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event: 'report_published', id: 'private-report-id' } }));
  act(() => { dispatch(); dispatch(); });
  expect(mock.capture.mock.calls.filter(([name]) => name === 'report_published')).toEqual([['report_published', { page_type: '/' }]]);
  const options = mock.init.mock.calls[0][1];
  expect(options.autocapture.dom_event_allowlist).toEqual(['click', 'change', 'submit']);
  expect(options.disable_session_recording).toBe(true);
  const result = options.before_send({ event: 'report_published', properties: {
    distinct_id: 'anonymous', '$current_url': 'https://litterbugs.app/?token=secret',
    '$initial_current_url': 'https://litterbugs.app/?email=private', report_id: 'private',
    description: 'private text', '$referrer': 'https://example.com/private', page_type: '/',
  } });
  expect(JSON.stringify(result)).not.toMatch(/secret|private text|report_id|initial_current_url/);
});
it('does not measure private account pages', async () => {
  mock.allowed = true; mock.path = '/account/reports/private-id';
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted'); localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'accepted');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.init).toHaveBeenCalled());
  expect(mock.capture).not.toHaveBeenCalled();
});

it.each(['doNotTrack', 'globalPrivacyControl'])('honors %s even with saved consent', async signal => {
  mock.allowed = true;
  vi.stubGlobal('navigator', { [signal]: signal === 'doNotTrack' ? '1' : true });
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted'); localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'accepted');
  render(<WebsiteAnalytics config={config} />);
  await act(async () => {});
  expect(mock.init).not.toHaveBeenCalled();
  expect(screen.queryByTestId('google-script')).toBeNull();
});

it('sends confirmed contribution once to both providers without payment details', async () => {
  mock.allowed = true;
  const gtag = vi.fn();
  Object.defineProperty(window, 'gtag', { configurable: true, value: gtag });
  render(<WebsiteAnalytics config={config} />);
  act(() => window.dispatchEvent(new Event(ANALYTICS_PREFERENCES)));
  fireEvent.click(screen.getByText('Allow analytics'));
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/' }));
  act(() => {
    for (let i = 0; i < 2; i++) window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, {
      detail: { event: 'contribution_confirmed', id: 'private-payment-reference', amount: 600, email: 'private@example.invalid' },
    }));
  });
  expect(mock.capture.mock.calls.filter(([name]) => name === 'contribution_confirmed'))
    .toEqual([['contribution_confirmed', { page_type: '/' }]]);
  const events = gtag.mock.calls.filter(([command, event]) => command === 'event' && event === 'contribution_confirmed');
  expect(events).toHaveLength(1);
  expect(events[0][2]).toEqual({ page_type: '/', page_location: 'https://litterbugs.app/', page_title: 'Litterbugs', page_referrer: '', workflow_version: WORKFLOW_VERSION });
  expect(JSON.stringify(events)).not.toMatch(/private|600/);
  delete (window as Window & { gtag?: unknown }).gtag;
});

it('measures SEO-page navigation once per visit in both providers', async () => {
  mock.allowed = true;
  const gtag = vi.fn();
  Object.defineProperty(window, 'gtag', { configurable: true, value: gtag });
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted'); localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'accepted');
  const view = render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/' }));
  for (const path of ['/report-litter', '/fund-a-cleanup', '/cleaner', '/locations', '/locations/us-nc-boone', '/cleanups', '/get-app']) {
    mock.path = path;
    view.rerender(<WebsiteAnalytics config={config} />);
    await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: path }));
    view.rerender(<WebsiteAnalytics config={config} />);
    expect(mock.capture.mock.calls.filter(([event, props]) => event === '$pageview' && props.page_type === path)).toHaveLength(1);
    expect(gtag.mock.calls.filter(([command, event, props]) => command === 'event' && event === 'page_view' && props.page_type === path)).toHaveLength(1);
  }
  delete (window as Window & { gtag?: unknown }).gtag;
});

it('counts public profile views without sending member IDs or profile clicks', async () => {
  mock.allowed = true;
  const gtag = vi.fn();
  Object.defineProperty(window, 'gtag', { configurable: true, value: gtag });
  const firstProfile = '/members/12345678-1234-1234-1234-123456789abc';
  const nextProfile = '/members/abcdef12-1234-1234-1234-123456789abc';
  const setPath = (path: string) => {
    mock.path = path;
    window.history.replaceState({}, '', `${path}?from=private-report`);
  };
  setPath(firstProfile);
  const view = render(<WebsiteAnalytics config={config} />);
  try {
    await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/members/profile' }));
    const beforeSend = mock.init.mock.calls[0][1].before_send;
    const event = beforeSend({ event: '$pageview', properties: { page_type: '/members/profile', $current_url: window.location.href, $pathname: firstProfile } });
    expect(event.properties.$current_url).toBe('https://litterbugs.app/members/profile');
    expect(event.properties.$pathname).toBe('/members/profile');
    expect(beforeSend({ event: '$autocapture', properties: {} })).toBeNull();
    expect(beforeSend({ event: '$rageclick', properties: {} })).toBeNull();

    setPath(nextProfile);
    view.rerender(<WebsiteAnalytics config={config} />);
    const pageViews = () => gtag.mock.calls.filter(([command, event]) => command === 'event' && event === 'page_view');
    await waitFor(() => expect(pageViews()).toHaveLength(2));
    expect(pageViews().map(([, , props]) => props.page_location)).toEqual(Array(2).fill('https://litterbugs.app/members/profile'));
    expect(mock.capture.mock.calls.filter(([name]) => name === '$pageview')).toHaveLength(2);
    expect(JSON.stringify([event, pageViews(), mock.capture.mock.calls])).not.toMatch(/12345678-|abcdef12-|private-report/);
  } finally {
    window.history.replaceState({}, '', '/');
    delete (window as Window & { gtag?: unknown }).gtag;
  }
});

it('keeps community engagement separate from confirmed outcomes and removes private properties', async () => {
  mock.allowed = true;
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted'); localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'accepted');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/' }));
  act(() => window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event: 'community_saved', community_id: 'us-nc-boone', email: 'private@example.com' } })));
  expect(mock.capture).toHaveBeenCalledWith('community_saved', { page_type: '/', community_id: 'us-nc-boone' });
  expect(mock.capture.mock.calls.filter(([name]) => ['report_published', 'contribution_confirmed', 'cleanup_approved'].includes(name))).toHaveLength(0);
  const options = mock.init.mock.calls[0][1];
  const safe = options.before_send({ properties: { community_id: 'us-nc-boone', action: 'fund', resource_id: 'secret', report_id: 'secret', email: 'private' } });
  expect(safe.properties.community_id).toBe('us-nc-boone');
  expect(safe.properties.action).toBe('fund');
  expect(JSON.stringify(safe)).not.toMatch(/secret|email/);
});
it('observes internal community report clicks before router navigation prevents the default action', async () => {
  mock.allowed = true;
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted'); localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'accepted');
  render(<><WebsiteAnalytics config={config} /><main data-community-slug="us-nc-boone"><Link href="/reports/secret" onClick={event => event.preventDefault()}>Local report</Link></main></>);
  await waitFor(() => expect(mock.capture).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('link', { name: 'Local report' }));
  expect(mock.capture).toHaveBeenCalledWith('community_report_opened', { page_type: '/', community_id: 'us-nc-boone' });
});
it('deduplicates a confirmed approval and ignores unknown community identifiers', async () => {
  mock.allowed = true;
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted'); localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'accepted');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.capture).toHaveBeenCalled());
  act(() => { for (let i = 0; i < 2; i++) window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event: 'cleanup_approved', id: 'private-attempt', community_id: 'us-nc-boone' } })); });
  expect(mock.capture.mock.calls.filter(([name]) => name === 'cleanup_approved')).toEqual([['cleanup_approved', { page_type: '/', community_id: 'us-nc-boone' }]]);
});

it('sends and deduplicates a confirmed outcome without a visitor choice', async () => {
  mock.allowed = true;
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/' }));
  act(() => {
    for (let i = 0; i < 2; i++) window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, {
      detail: { event: 'report_published', id: 'private-report-id' },
    }));
  });
  expect(mock.capture.mock.calls.filter(([name]) => name === 'report_published'))
    .toEqual([['report_published', { page_type: '/' }]]);
  expect(localStorage.getItem('litterbugs:analytics-observed:report_published:private-report-id:posthog')).toBeNull();
});


it('records time on public pages on navigation and page exit', async () => {
  mock.allowed = true;
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const view = render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', expect.objectContaining({ page_type: '/' })));
  now.mockReturnValue(13500);
  mock.path = '/about';
  view.rerender(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageleave', {
    page_type: '/', $prev_pageview_pathname: '/', $prev_pageview_duration: 12.5,
  }, undefined));
  now.mockReturnValue(15500);
  act(() => window.dispatchEvent(new Event('pagehide')));
  expect(mock.capture).toHaveBeenCalledWith('$pageleave', {
    page_type: '/about', $prev_pageview_pathname: '/about', $prev_pageview_duration: 2,
  }, { transport: 'sendBeacon', send_instantly: true });
  act(() => window.dispatchEvent(new Event('pagehide')));
  expect(mock.capture.mock.calls.filter(([name]) => name === '$pageleave')).toHaveLength(2);
  now.mockRestore();
});

it('keeps leave timing while removing private interaction and route details', async () => {
  mock.allowed = true;
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.init).toHaveBeenCalled());
  const beforeSend = mock.init.mock.calls[0][1].before_send;
  window.history.replaceState({}, '', '/account/private-id?token=secret');
  const leave = beforeSend({ event: '$pageleave', properties: {
    page_type: '/reports/detail', '$prev_pageview_duration': 12.5,
    '$prev_pageview_pathname': '/reports/private-id', '$current_url': 'https://litterbugs.app/account/private-id?token=secret',
    '$elements': [{ text: 'private text' }], email: 'private@example.invalid',
  } });
  expect(leave.properties.$pathname).toBe('/reports/detail');
  expect(leave.properties.$prev_pageview_pathname).toBe('/reports/detail');
  expect(leave.properties.$prev_pageview_duration).toBe(12.5);
  expect(JSON.stringify(leave)).not.toMatch(/private-id|secret|private text|private@example/);
  expect(beforeSend({ event: '$autocapture', properties: { '$elements': [{ text: 'private text' }] } })).toBeNull();
  window.history.replaceState({}, '', '/');
});

it('measures support checkout intent with allowlisted properties and respects analytics exclusion', async () => {
  mock.allowed = true;
  const view = render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', {page_type:'/'}));
  act(() => window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, {detail:{event:'support_checkout_clicked',amount:5,currency:'USD',billing_interval:'month',email:'private@example.com'}})));
  expect(mock.capture).toHaveBeenCalledWith('support_checkout_clicked', {page_type:'/',amount:5,currency:'USD',billing_interval:'month'});
  const beforeSend = mock.init.mock.calls[0][1].before_send;
  const sanitized = beforeSend({event:'support_checkout_clicked',properties:{amount:5,currency:'USD',billing_interval:'month',email:'private@example.com'}});
  expect(sanitized.properties.amount).toBe(5); expect(sanitized.properties.email).toBeUndefined();
  mock.capture.mockClear();
  act(() => window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, {detail:{event:'support_checkout_clicked',amount:999,currency:'USD',billing_interval:'month'}})));
  expect(mock.capture).not.toHaveBeenCalled();
  view.unmount(); mock.allowed = false;
  render(<WebsiteAnalytics config={config} />);
  act(() => window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, {detail:{event:'support_checkout_clicked',amount:5,currency:'USD',billing_interval:'month'}})));
  expect(mock.capture).not.toHaveBeenCalled();
});

it('counts a store badge tap without forwarding raw campaign or link data', async () => {
  mock.allowed = true;
  mock.path = '/get-app';
  window.history.replaceState({}, '', '/get-app?utm_source=ig&fbclid=private');
  try {
    render(<><WebsiteAnalytics config={config} /><a href="https://play.google.com/store/apps/details?id=com.litterbugs.app&utm_source=instagram" onClick={event => event.preventDefault()}>Google Play</a></>);
    await waitFor(() => expect(mock.capture).toHaveBeenCalledWith('$pageview', { page_type: '/get-app' }));
    fireEvent.click(screen.getByText('Google Play'));
    expect(mock.capture).toHaveBeenCalledWith('app_store_badge_clicked', {
      page_type: '/get-app', store: 'google_play', campaign: 'instagram',
    });
    const beforeSend = mock.init.mock.calls[0][1].before_send;
    const event = beforeSend({ event: 'app_store_badge_clicked', properties: { store: 'google_play', campaign: 'instagram', href: 'private' } });
    expect(event.properties.store).toBe('google_play');
    expect(event.properties.campaign).toBe('instagram');
    expect(JSON.stringify(event)).not.toContain('private');
  } finally {
    window.history.replaceState({}, '', '/');
  }
});

it('keeps only known participation stages and strips private payloads', async () => {
  mock.allowed = true;
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(mock.init).toHaveBeenCalled());
  const beforeSend = mock.init.mock.calls[0][1].before_send;
  const event = beforeSend({
    event: 'participation_step',
    properties: { action: 'clean', stage: 'safety_review', report_id: 'private-id', email: 'private@example.com' },
  });
  expect(event.properties.action).toBe('clean');
  expect(event.properties.stage).toBe('safety_review');
  expect(JSON.stringify(event)).not.toMatch(/private-id|private@example/);
  expect(beforeSend({ event: 'participation_step', properties: { action: 'fund', stage: 'safety_review' } })).toBeNull();
});
