// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://litterbugs.app/map"}
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WebsiteAnalytics } from './website-analytics';
import { WORKFLOW_VERSION, clearParticipationContext, drainJourneys, trackAppChoice, trackMapDiscovery, trackMapLoading, trackPayoutSetup, trackParticipationExit, drainParticipation, drainParticipationFailures, drainWebsiteOutcomes, rememberContributionAttempt, trackParticipation, trackParticipationFailure, trackWebsiteOutcome } from '@/lib/website-analytics';

const sdk = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn(), googleReady: false }));
vi.mock('posthog-js', () => ({ default: sdk }));
vi.mock('next/navigation', () => ({ usePathname: () => window.location.pathname }));
vi.mock('next/script', () => ({ default: function FakeScript({ onReady }: { onReady: () => void }) {
  useEffect(() => { if (sdk.googleReady) onReady(); }, [onReady]);
  return null;
} }));
const config = { enabled: true, production: true, gaId: 'G-TEST', posthogKey: 'phc_test', posthogHost: 'https://us.i.posthog.com' };
beforeEach(() => {
  vi.clearAllMocks(); sdk.googleReady = false; localStorage.clear();
  drainParticipation(); drainParticipationFailures(); drainWebsiteOutcomes(); drainJourneys(); clearParticipationContext();
  window.history.replaceState({}, '', '/map');
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals();
  delete (window as Window & { gtag?: unknown }).gtag;
  delete (window as Window & { clarity?: unknown }).clarity;
  document.querySelectorAll('script[src*="clarity.ms/tag/"]').forEach(script => script.remove());
});

it('delivers early flow events once to Google when its script becomes ready later than PostHog', async () => {
  const gtag = vi.fn();
  Object.defineProperty(window, 'gtag', { configurable: true, value: gtag });
  const view = render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  act(() => {
    trackAppChoice('open_requested', 'report', 'app_store');
    trackMapDiscovery('location_selected', { surface: 'toolbar_search' });
    trackParticipation('report', 'location_confirmed');
    trackParticipationFailure('report', 'review', 'photo_upload_failed');
  });
  expect(sdk.capture).toHaveBeenCalledWith('participation_step', expect.objectContaining({ stage: 'location_confirmed' }));
  expect(gtag.mock.calls.some(([command, event]) => command === 'event' && event === 'participation_step')).toBe(false);
  window.history.replaceState({}, '', '/about?token=secret');
  sdk.googleReady = true;
  view.rerender(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(gtag).toHaveBeenCalledWith('event', 'page_view', expect.objectContaining({ page_type: '/about' })));
  await waitFor(() => expect(gtag).toHaveBeenCalledWith('event', 'participation_step', {
    action: 'report', stage: 'location_confirmed', page_type: '/map', workflow_version: WORKFLOW_VERSION,
  }));
  expect(gtag).toHaveBeenCalledWith('event', 'map_discovery', expect.objectContaining({ stage: 'location_selected', page_type: '/map' }));
  expect(gtag).toHaveBeenCalledWith('event', 'participation_failure', expect.objectContaining({ reason: 'photo_upload_failed', page_type: '/map' }));
  view.rerender(<WebsiteAnalytics config={config} />);
  for (const name of ['participation_step', 'participation_failure', 'map_discovery', 'app_choice']) {
    expect(sdk.capture.mock.calls.filter(([event]) => event === name)).toHaveLength(1);
    expect(gtag.mock.calls.filter(([command, event]) => command === 'event' && event === name)).toHaveLength(1);
  }
  expect(JSON.stringify(gtag.mock.calls)).not.toMatch(/private|secret/);
});

it('retains confirmed outcomes for a late Google script without duplicating them or changing their safe page', async () => {
  const gtag = vi.fn();
  Object.defineProperty(window, 'gtag', { configurable: true, value: gtag });
  const view = render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  act(() => { trackWebsiteOutcome('report_published', 'private-report'); trackWebsiteOutcome('report_published', 'private-report'); });
  expect(sdk.capture.mock.calls.filter(([event]) => event === 'report_published')).toHaveLength(1);
  window.history.replaceState({}, '', '/about?token=secret');
  sdk.googleReady = true;
  view.rerender(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(gtag).toHaveBeenCalledWith('event', 'report_published', expect.objectContaining({ page_type: '/map', page_location: 'https://litterbugs.app/map' })));
  act(() => trackWebsiteOutcome('report_published', 'private-report'));
  expect(gtag.mock.calls.filter(([command, event]) => command === 'event' && event === 'report_published')).toHaveLength(1);
  expect(sdk.capture.mock.calls.filter(([event]) => event === 'report_published')).toHaveLength(1);
  const send = sdk.init.mock.calls[0][1].before_send;
  expect(send({ event: 'report_published', properties: { page_type: '/map' } }).properties.$pathname).toBe('/map');
  expect(JSON.stringify([gtag.mock.calls, sdk.capture.mock.calls])).not.toMatch(/private-report|token|secret/);
});

it('still delivers flow events to Google if PostHog initialization fails', async () => {
  const gtag = vi.fn();
  Object.defineProperty(window, 'gtag', { configurable: true, value: gtag });
  sdk.init.mockImplementationOnce(() => { throw new Error('SDK unavailable'); });
  sdk.googleReady = true;
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(gtag).toHaveBeenCalledWith('event', 'page_view', expect.anything()));
  act(() => trackParticipation('clean', 'safety_review'));
  expect(gtag).toHaveBeenCalledWith('event', 'participation_step', expect.objectContaining({ action: 'clean', stage: 'safety_review' }));
  expect(sdk.capture).not.toHaveBeenCalled();
});

it.each(['doNotTrack', 'globalPrivacyControl'])('drops queued deliveries if %s turns on before the other provider is ready', async signal => {
  const gtag = vi.fn();
  Object.defineProperty(window, 'gtag', { configurable: true, value: gtag });
  const view = render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  act(() => { trackParticipation('report', 'photos'); trackWebsiteOutcome('report_published', 'private-report'); });
  vi.stubGlobal('navigator', { [signal]: signal === 'doNotTrack' ? '1' : true });
  sdk.googleReady = true;
  view.rerender(<WebsiteAnalytics config={config} />);
  await act(async () => {});
  expect(gtag.mock.calls.some(([command, event]) => command === 'event' && ['participation_step', 'report_published'].includes(event))).toBe(false);
});

it('delivers pre-initialization steps, failures and confirmed outcomes once with their original safe page', async () => {
  trackParticipation('report', 'review');
  trackParticipationFailure('report', 'review', 'photo_upload_failed');
  trackWebsiteOutcome('report_published', 'private-report');
  // The visitor navigates before the SDK finishes importing.
  window.history.replaceState({}, '', '/account/private?token=secret');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.capture).toHaveBeenCalledWith('report_published', { page_type: '/private' }));
  expect(sdk.capture.mock.calls.filter(([event]) => event === 'report_published')).toHaveLength(1);
  const beforeSend = sdk.init.mock.calls[0][1].before_send;
  const failure = sdk.capture.mock.calls.find(([event]) => event === 'participation_failure')!;
  expect(beforeSend({ event: failure[0], properties: failure[1] }).properties).toMatchObject({ action: 'report', stage: 'review', reason: 'photo_upload_failed', $pathname: '/map' });
  expect(JSON.stringify(sdk.capture.mock.calls)).not.toMatch(/private-report|secret/);
  expect(sdk.capture).toHaveBeenCalledWith('participation_step', { action: 'report', stage: 'published', page_type: '/map' });
});

it.each(['report', 'fund', 'clean'] as const)('records a one-use successful %s auth return while retaining the task URL', async action => {
  const next = action === 'report' ? '/report?report_lat=36.123&report_lng=-81.456' : `/map?report=private-report&intent=${action}&returnTo=%2Fcommunities%2Fus%2Fnc%2Fboone`;
  window.history.replaceState({}, '', `${next}&participation_auth=${action}%3Asuccess#map=36,-81,14`);
  const view = render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.capture).toHaveBeenCalledWith('participation_step', expect.objectContaining({ action, stage: 'auth_succeeded' })));
  expect(window.location.search).not.toContain('participation_auth');
  expect(window.location.hash).toBe('#map=36,-81,14');
  expect(window.location.search).toContain(action === 'report' ? 'report_lat=36.123' : `intent=${action}`);
  view.rerender(<WebsiteAnalytics config={config} />);
  expect(sdk.capture.mock.calls.filter(([event, properties]) => event === 'participation_step' && properties.stage === 'auth_succeeded')).toHaveLength(1);
});

it('records a callback failure without sending the callback URL or code', async () => {
  window.history.replaceState({}, '', '/?authError=callback&participation_auth=clean%3Afailed');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.capture).toHaveBeenCalledWith('participation_failure', { action: 'clean', stage: 'auth_submitted', reason: 'auth_return_failed', page_type: '/' }, { transport: 'sendBeacon', send_instantly: true }));
});

it('records auth success before a resumed photo step even when the form mounts before analytics', async () => {
  window.history.replaceState({}, '', '/report?report_lat=36&report_lng=-81&participation_auth=report%3Asuccess');
  trackParticipation('report', 'photos');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.capture).toHaveBeenCalledWith('participation_step', expect.objectContaining({ stage: 'photos' })));
  expect(sdk.capture.mock.calls.filter(([event]) => event === 'participation_step').map(([, properties]) => properties.stage)).toEqual(['auth_succeeded', 'photos']);
});

it('keeps payment submission separate from server-confirmed payment', async () => {
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  act(() => { trackParticipation('fund', 'payment_submitted'); rememberContributionAttempt('private-payment'); });
  expect(sdk.capture.mock.calls.some(([event]) => event === 'contribution_confirmed')).toBe(false);
  act(() => trackWebsiteOutcome('contribution_confirmed', 'private-payment'));
  expect(sdk.capture).toHaveBeenCalledWith('contribution_confirmed', { page_type: '/map' });
  expect(sdk.capture).toHaveBeenCalledWith('participation_step', { action: 'fund', stage: 'payment_confirmed', page_type: '/map' });
});

it('rejects arbitrary failure reasons and strips private details at the SDK boundary', async () => {
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  const send = sdk.init.mock.calls[0][1].before_send;
  const safe = send({ event: 'participation_failure', properties: { action: 'clean', stage: 'evidence_form', reason: 'photo_upload_failed', error: 'private filename or card detail', latitude: 36, report_id: 'secret' } });
  expect(safe.properties.reason).toBe('photo_upload_failed');
  expect(JSON.stringify(safe)).not.toMatch(/filename|card detail|latitude|secret/);
  expect(send({ event: 'participation_failure', properties: { action: 'clean', stage: 'evidence_form', reason: 'private error text' } })).toBeNull();
});

it.each(['declined', 'doNotTrack', 'globalPrivacyControl'])('does not queue or transmit when excluded by %s', async reason => {
  if (reason === 'declined') localStorage.setItem('litterbugs:analytics-consent:v1', 'declined');
  else vi.stubGlobal('navigator', { [reason]: reason === 'doNotTrack' ? '1' : true });
  trackParticipation('clean', 'claim_confirmed');
  trackParticipationFailure('clean', 'safety_review', 'claim_failed');
  trackWebsiteOutcome('cleanup_approved', 'private-attempt');
  trackMapDiscovery('results_empty', { result_bucket: '0' });
  trackMapLoading({ stage: 'failed', reason: 'startup_timeout', elapsed_ms: 12000, backgrounded: false });
  trackPayoutSetup('opened');
  trackParticipationExit('clean', 'safety_review', 'cancelled');
  trackAppChoice('website_continued', 'report');
  render(<WebsiteAnalytics config={{ ...config, clarityId: 'test123' }} />);
  await act(async () => {});
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.capture).not.toHaveBeenCalled();
  expect(document.querySelector('script[src*="clarity.ms/tag/"]')).toBeNull();
  expect([...drainParticipation(), ...drainParticipationFailures(), ...drainWebsiteOutcomes(), ...drainJourneys()]).toEqual([]);
});

it('sends only bounded app-choice dimensions and never infers an install or successful app open', async () => {
  window.history.replaceState({}, '', '/get-app?report=private-id&token=secret');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  act(() => {
    trackAppChoice('open_requested', 'report', 'google_play');
    trackAppChoice('store_fallback', 'report', 'google_play');
    trackAppChoice('website_continued', 'report');
  });
  expect(sdk.capture.mock.calls.filter(([event]) => event === 'app_choice')).toEqual([
    ['app_choice', { stage: 'open_requested', destination: 'report', store: 'google_play', page_type: '/get-app' }, { transport: 'sendBeacon', send_instantly: true }],
    ['app_choice', { stage: 'store_fallback', destination: 'report', store: 'google_play', page_type: '/get-app' }, { transport: 'sendBeacon', send_instantly: true }],
    ['app_choice', { stage: 'website_continued', destination: 'report', page_type: '/get-app' }, { transport: 'sendBeacon', send_instantly: true }],
  ]);
  const sanitize = sdk.init.mock.calls[0][1].before_send;
  const safe = sanitize({ event: 'app_choice', properties: { stage: 'open_requested', destination: 'report', store: 'app_store', report_id: 'private-id', url: 'secret', page_type: '/get-app' } });
  expect(safe.properties).toMatchObject({ stage: 'open_requested', destination: 'report', store: 'app_store', $pathname: '/get-app' });
  expect(JSON.stringify([safe, sdk.capture.mock.calls])).not.toMatch(/private-id|secret/);
  for (const properties of [
    { stage: 'installed', destination: 'report' },
    { stage: 'open_requested', destination: 'report', store: 'private-url' },
    { stage: 'website_continued', destination: 'private-report-id' },
  ]) expect(sanitize({ event: 'app_choice', properties })).toBeNull();
});

it('buffers new journey signals before SDK readiness and labels the actual bundle version', async () => {
  trackMapDiscovery('results_empty', { surface: 'map', result_bucket: '0', filtered: true });
  trackPayoutSetup('opened');
  trackParticipationExit('report', 'review', 'saved_for_later');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.capture).toHaveBeenCalledWith('participation_decision', { action: 'report', stage: 'review', exit_type: 'saved_for_later', page_type: '/map' }));
  const beforeSend = sdk.init.mock.calls[0][1].before_send;
  for (const [event, properties] of sdk.capture.mock.calls) {
    const result = beforeSend({ event, properties: { ...properties, workflow_version: 'forged-version', query: 'private address', account: 'secret' } });
    expect(result.properties.workflow_version).toBe(WORKFLOW_VERSION);
    expect(JSON.stringify(result)).not.toMatch(/private address|forged-version|secret/);
  }
  expect(sdk.capture.mock.calls.filter(([event]) => event === 'payout_setup')).toHaveLength(1);
});
it('keeps the known entry source through action steps and replaces it on the next explicit action', async () => {
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  window.history.replaceState({}, '', '/map?report=private-id');
  act(() => {
    trackMapDiscovery('report_opened', { source: 'map_pin' });
    trackParticipation('fund', 'action_tapped');
    trackParticipation('fund', 'amount_review');
  });
  expect(sdk.capture).toHaveBeenCalledWith('participation_step', { action: 'fund', stage: 'amount_review', source: 'map_pin', page_type: '/map' });
  act(() => trackParticipation('fund', 'action_tapped', 'homepage'));
  act(() => trackParticipation('fund', 'auth_shown'));
  expect(sdk.capture).toHaveBeenCalledWith('participation_step', { action: 'fund', stage: 'auth_shown', source: 'homepage', page_type: '/map' });
  expect(JSON.stringify(sdk.capture.mock.calls)).not.toContain('private-id');
});
it('rejects unknown journey stages and keeps payout events free of provider details', async () => {
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  const send = sdk.init.mock.calls[0][1].before_send;
  expect(send({ event: 'map_discovery', properties: { stage: 'raw address', source: 'private address' } })).toBeNull();
  expect(send({ event: 'participation_decision', properties: { action: 'fund', stage: 'review', exit_type: 'cancelled' } })).toBeNull();
  const safe = send({ event: 'payout_setup', properties: { stage: 'form_exited', account_id: 'private', bank_account: 'private', step: 'private' } });
  expect(safe.properties.stage).toBe('form_exited');
  expect(JSON.stringify(safe)).not.toMatch(/account_id|bank_account|private/);
});

it('delivers map startup failures queued before SDK readiness and sanitizes their payload', async () => {
  trackMapLoading({ stage: 'started', elapsed_ms: 0, backgrounded: false });
  trackMapLoading({ stage: 'failed', reason: 'authorization_failed', elapsed_ms: 2400, backgrounded: false });
  window.history.replaceState({}, '', '/about?key=secret');
  render(<WebsiteAnalytics config={config} />);
  await waitFor(() => expect(sdk.capture).toHaveBeenCalledWith('map_loading', {
    stage: 'failed', reason: 'authorization_failed', elapsed_ms: 2400, backgrounded: false, page_type: '/map',
  }, { transport: 'sendBeacon', send_instantly: true }));
  const sanitize = sdk.init.mock.calls[0][1].before_send;
  const result = sanitize({ event: 'map_loading', properties: {
    stage: 'failed', reason: 'initialization_failed', elapsed_ms: 1234, backgrounded: false, page_type: '/map',
    latitude: 36, longitude: -81, report_id: 'private-id', error: 'secret', url: 'private address',
  } });
  expect(result.properties).toMatchObject({ stage: 'failed', reason: 'initialization_failed', elapsed_ms: 1200, backgrounded: false, $pathname: '/map', workflow_version: WORKFLOW_VERSION });
  expect(JSON.stringify(result)).not.toMatch(/latitude|longitude|private|secret/);
  expect(sanitize({ event: 'map_loading', properties: { stage: 'failed', reason: 'private error', elapsed_ms: 10, backgrounded: false } })).toBeNull();
  expect(sdk.capture.mock.calls.filter(([event]) => event === 'map_loading')).toHaveLength(2);
});

const recordingConfig = { ...config, clarityId: 'test123' };
function finishClarityLoad(clarity = vi.fn()) {
  Object.defineProperty(window, 'clarity', { configurable: true, writable: true, value: clarity });
  act(() => document.querySelector('script[src="https://www.clarity.ms/tag/test123"]')!.dispatchEvent(new Event('load')));
  return clarity;
}

it('preserves interleaved steps, failures and exits for late Clarity without resending to PostHog', async () => {
  trackParticipation('clean', 'action_tapped');
  trackParticipation('clean', 'safety_review');
  trackParticipationFailure('clean', 'safety_review', 'claim_failed');
  trackParticipationExit('clean', 'safety_review', 'cancelled');
  const view = render(<WebsiteAnalytics config={recordingConfig} />);
  await waitFor(() => expect(sdk.capture.mock.calls.filter(([name]) => name !== '$pageview')).toHaveLength(4));
  expect(sdk.capture.mock.calls.filter(([name]) => name !== '$pageview').map(([name, props]) => [name, props.stage])).toEqual([
    ['participation_step', 'action_tapped'], ['participation_step', 'safety_review'],
    ['participation_failure', 'safety_review'], ['participation_decision', 'safety_review'],
  ]);
  expect((window as Window & { clarity?: { q: unknown[][] } }).clarity?.q).toEqual([]);
  const clarity = finishClarityLoad();
  await waitFor(() => expect(clarity.mock.calls.filter(([cmd]) => cmd === 'event').map(([, name]) => name)).toEqual([
    'lb_cleanup_started', 'lb_cleanup_safety_shown', 'lb_cleanup_failed', 'lb_cleanup_cancelled',
  ]));
  expect(clarity).toHaveBeenCalledWith('set', 'lb_workflow_version', WORKFLOW_VERSION);
  expect(clarity).toHaveBeenCalledWith('set', 'lb_cleanup_failure_reason', 'claim_failed');
  sdk.googleReady = true;
  view.rerender(<WebsiteAnalytics config={recordingConfig} />);
  await waitFor(() => expect((window as unknown as { dataLayer: unknown[][] }).dataLayer.some(call => call[1] === 'participation_decision')).toBe(true));
  expect(clarity.mock.calls.filter(([cmd]) => cmd === 'event')).toHaveLength(4);
  expect(sdk.capture.mock.calls.filter(([name]) => name !== '$pageview')).toHaveLength(4);
  expect(sdk.capture).toHaveBeenCalledWith('participation_decision', expect.objectContaining({ action: 'clean', exit_type: 'cancelled' }), { transport: 'sendBeacon', send_instantly: true });
});

it('delivers map failure and recovery to Clarity when PostHog fails and Google never loads', async () => {
  sdk.init.mockImplementationOnce(() => { throw new Error('unavailable'); });
  const view = render(<WebsiteAnalytics config={recordingConfig} />);
  act(() => {
    trackMapLoading({ stage: 'failed', elapsed_ms: 12000, backgrounded: false, reason: 'startup_timeout' });
    trackMapLoading({ stage: 'recovered', elapsed_ms: 14000, backgrounded: false });
  });
  window.history.replaceState({}, '', '/reports/private-id?token=secret');
  const clarity = finishClarityLoad();
  await waitFor(() => expect(clarity).toHaveBeenCalledWith('event', 'lb_map_recovered'));
  view.rerender(<WebsiteAnalytics config={recordingConfig} />);
  expect(clarity.mock.calls.filter(([cmd]) => cmd === 'event')).toEqual([
    ['event', 'lb_map_failed'], ['event', 'lb_map_recovered'],
  ]);
  expect(JSON.stringify(clarity.mock.calls)).not.toMatch(/private-id|secret|token|report_id/);
  expect(sdk.capture).not.toHaveBeenCalled();
});

it('bounds the queue for a blocked Clarity script while other providers keep receiving events', async () => {
  render(<WebsiteAnalytics config={recordingConfig} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  act(() => { for (let i = 0; i < 200; i++) trackMapDiscovery('results_empty', { filtered: false }); });
  expect(sdk.capture.mock.calls.filter(([name]) => name === 'map_discovery')).toHaveLength(200);
  expect((window as Window & { clarity?: { q: unknown[][] } }).clarity?.q).toEqual([]);
  const clarity = finishClarityLoad();
  await waitFor(() => expect(clarity.mock.calls.filter(([cmd]) => cmd === 'event')).toHaveLength(150));
  expect(sdk.capture.mock.calls.filter(([name]) => name === 'map_discovery')).toHaveLength(200);
});

it('does not let a Clarity error interrupt PostHog or duplicate an accepted marker on retry', async () => {
  const view = render(<WebsiteAnalytics config={recordingConfig} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  const clarity = finishClarityLoad();
  await waitFor(() => expect(clarity).toHaveBeenCalledWith('set', 'lb_workflow_version', WORKFLOW_VERSION));
  clarity.mockImplementationOnce(() => { throw new Error('recording unavailable'); });
  act(() => trackParticipation('clean', 'safety_review'));
  expect(sdk.capture).toHaveBeenCalledWith('participation_step', expect.objectContaining({ stage: 'safety_review' }));
  act(() => trackMapDiscovery('results_loaded'));
  expect(clarity.mock.calls.filter(([cmd, name]) => cmd === 'event' && name === 'lb_cleanup_safety_shown')).toHaveLength(1);
  view.rerender(<WebsiteAnalytics config={recordingConfig} />);
  expect(clarity.mock.calls.filter(([cmd]) => cmd === 'event')).toHaveLength(1);
});

it.each(['doNotTrack', 'globalPrivacyControl'])('discards delayed Clarity markers when %s is enabled', async signal => {
  render(<WebsiteAnalytics config={recordingConfig} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  act(() => trackParticipation('clean', 'safety_review'));
  vi.stubGlobal('navigator', { [signal]: signal === 'doNotTrack' ? '1' : true });
  const clarity = finishClarityLoad();
  act(() => trackParticipationExit('clean', 'safety_review', 'cancelled'));
  await act(async () => {});
  expect(clarity).not.toHaveBeenCalled();
});

it('does not infer cleanup abandonment from a hidden tab, pagehide, or a successful claim', async () => {
  render(<WebsiteAnalytics config={recordingConfig} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  const clarity = finishClarityLoad();
  await waitFor(() => expect(clarity).toHaveBeenCalledWith('set', 'lb_workflow_version', WORKFLOW_VERSION));
  act(() => {
    trackParticipation('clean', 'action_tapped');
    document.dispatchEvent(new Event('visibilitychange'));
    trackParticipation('clean', 'claim_confirmed');
    window.dispatchEvent(new Event('pagehide'));
  });
  expect(clarity.mock.calls.filter(([cmd]) => cmd === 'event')).toEqual([
    ['event', 'lb_cleanup_started'], ['event', 'lb_cleanup_claimed'],
  ]);
});

it('loads only one Clarity script in Strict Mode and records one queued marker', async () => {
  trackParticipationExit('clean', 'safety_review', 'cancelled');
  render(<StrictMode><WebsiteAnalytics config={recordingConfig} /></StrictMode>);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  expect(document.querySelectorAll('script[src="https://www.clarity.ms/tag/test123"]')).toHaveLength(1);
  const clarity = finishClarityLoad();
  await waitFor(() => expect(clarity.mock.calls.filter(([cmd]) => cmd === 'event')).toEqual([['event', 'lb_cleanup_cancelled']]));
});

it('bounds the bootstrap if the tag loads but its recorder dependency stays blocked', async () => {
  localStorage.setItem('litterbugs:analytics-replay-consent:v1', 'accepted');
  render(<WebsiteAnalytics config={recordingConfig} />);
  await waitFor(() => expect(sdk.init).toHaveBeenCalled());
  act(() => document.querySelector('script[src="https://www.clarity.ms/tag/test123"]')!.dispatchEvent(new Event('load')));
  await act(async () => {});
  act(() => { for (let i = 0; i < 200; i++) trackMapDiscovery('results_empty', { filtered: true }); });
  const queue = (window as Window & { clarity?: { q: unknown[][] } }).clarity?.q ?? [];
  expect(queue).toHaveLength(250);
  expect(queue).toContainEqual(['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }]);
  expect(queue).toContainEqual(['set', 'lb_workflow_version', WORKFLOW_VERSION]);
});
