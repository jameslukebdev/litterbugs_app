// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://litterbugs.app/map"}
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WebsiteAnalytics } from './website-analytics';
import { WORKFLOW_VERSION, clearParticipationContext, drainJourneys, trackMapDiscovery, trackPayoutSetup, trackParticipationExit, drainParticipation, drainParticipationFailures, drainWebsiteOutcomes, rememberContributionAttempt, trackParticipation, trackParticipationFailure, trackWebsiteOutcome } from '@/lib/website-analytics';

const sdk = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: sdk }));
vi.mock('next/navigation', () => ({ usePathname: () => window.location.pathname }));
vi.mock('next/script', () => ({ default: () => null }));
const config = { enabled: true, production: true, gaId: 'G-TEST', posthogKey: 'phc_test', posthogHost: 'https://us.i.posthog.com' };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  drainParticipation(); drainParticipationFailures(); drainWebsiteOutcomes(); drainJourneys(); clearParticipationContext();
  window.history.replaceState({}, '', '/map');
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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
  await waitFor(() => expect(sdk.capture).toHaveBeenCalledWith('participation_failure', { action: 'clean', stage: 'auth_submitted', reason: 'auth_return_failed', page_type: '/' }));
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
  trackPayoutSetup('opened');
  trackParticipationExit('clean', 'safety_review', 'cancelled');
  render(<WebsiteAnalytics config={config} />);
  await act(async () => {});
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.capture).not.toHaveBeenCalled();
  expect([...drainParticipation(), ...drainParticipationFailures(), ...drainWebsiteOutcomes(), ...drainJourneys()]).toEqual([]);
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
