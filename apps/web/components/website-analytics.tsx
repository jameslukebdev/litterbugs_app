'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import type { PostHog } from 'posthog-js';
import { WORKFLOW_VERSION, MEMBER_PROFILE_PAGE, JOURNEY_EVENTS, clearParticipationContext, drainJourneys, drainWebsiteFlows, journeyProperties, entrySourceForPath, ANALYTICS_CONSENT_KEY, ANALYTICS_EVENT, ANALYTICS_PREFERENCES, ANALYTICS_REPLAY_CHOICE_KEY, analyticsAllowed, analyticsPage, analyticsReferrer, drainParticipation, drainParticipationFailures, drainWebsiteOutcomes, participationProperties, participationFailureProperties, consumeParticipationAuthResult, consumeSharedReportAuthResult, trackParticipation, trackParticipationFailure, type AnalyticsConfig, type JourneyEvent } from '@/lib/website-analytics';
import { COMMUNITY_ENGAGEMENT_EVENTS, communityClick, communityForPath, communityProperties, participationLinkAction } from '@/lib/community-metrics';
import styles from './website-analytics.module.css';
import { isInstagramStoreVisit, storeBadgeDestination, storeBadgeProperties } from '@/lib/app-links';
import { participationIntent } from '@/lib/participation-auth';
import { clarityJourney, immediateFlowDelivery, type WebsiteFlowEvent } from '@/lib/clarity-journey';
import { supportCheckoutProperties } from '@/lib/monthly-support';

type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] } };
type PendingFlowDelivery = {
  event: WebsiteFlowEvent;
  properties: Record<string, unknown>;
  googleSent: boolean;
  posthogSent: boolean;
  claritySent: boolean;
};
type PendingOutcomeDelivery = ReturnType<typeof drainWebsiteOutcomes>[number] & { page_type: string };
function google(...args: unknown[]) {
  if (args[0] === 'event' && args[2] && typeof args[2] === 'object') args[2] = { ...args[2], workflow_version: WORKFLOW_VERSION };
  (window as AnalyticsWindow).gtag?.(...args);
}
function privacySignal() { return navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true; }
// Google applies these regional defaults by visitor location.
const CONSENT_REQUIRED_REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH'];

export function AnalyticsPreferences() {
  return <button type="button" className={styles.preferences} onClick={() => window.dispatchEvent(new Event(ANALYTICS_PREFERENCES))}>Analytics choices</button>;
}

export function WebsiteAnalytics({ config }: { config: AnalyticsConfig }) {
  const pathname = usePathname();
  useEffect(() => {
    const url = new URL(window.location.href);
    consumeParticipationAuthResult();
    consumeSharedReportAuthResult();
    if (url.pathname === '/sign-in' && url.searchParams.get('google') === 'retry') {
      const action = participationIntent(url.searchParams.get('next') ?? '');
      if (action) trackParticipationFailure(action, 'auth_submitted', 'auth_start_failed');
    }
  }, [pathname]);
  const [consent, setConsent] = useState<'accepted' | 'declined' | null>(null);
  const [show, setShow] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [gaConfigured, setGaConfigured] = useState(false);
  const [gaReady, setGaReady] = useState(false);
  const [clarityReady, setClarityReady] = useState(false);
  const posthog = useRef<PostHog | null>(null);
  const lastGooglePage = useRef<string | null>(null);
  const lastPosthogPage = useRef<{ pathname: string; page: string; started: number } | null>(null);
  const permitted = useRef(false);
  const observedOutcomes = useRef(new Set<string>());
  const pendingFlowDeliveries = useRef<PendingFlowDelivery[]>([]);
  const pendingOutcomeDeliveries = useRef(new Map<string, PendingOutcomeDelivery>());
  const active = allowed && consent !== 'declined';
  const aggregate = allowed && consent !== 'declined';
  const clarityConfigured = Boolean(config.clarityId && /^[a-z0-9]+$/.test(config.clarityId));

  const finishPosthogPage = useCallback((unloading = false) => {
    const previous = lastPosthogPage.current;
    lastPosthogPage.current = null;
    if (!previous || !posthog.current || !permitted.current || privacySignal()) return;
    posthog.current.capture('$pageleave', {
      page_type: previous.page,
      $prev_pageview_pathname: previous.page,
      $prev_pageview_duration: Math.max(0, (Date.now() - previous.started) / 1000),
    }, unloading ? { transport: 'sendBeacon', send_instantly: true } : undefined);
  }, []);

  useEffect(() => {
    const canRun = analyticsAllowed(config, window.location.hostname) && !privacySignal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllowed(canRun);
    try {
      const saved = localStorage.getItem(ANALYTICS_REPLAY_CHOICE_KEY);
      if (saved === 'accepted' || saved === 'declined') setConsent(saved);
      else if (localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'declined') setConsent('declined');
    } catch { /* A visitor may use the site without storage. */ }
    const preferences = () => setShow(true);
    const storage = (event: StorageEvent) => { if (event.key === ANALYTICS_REPLAY_CHOICE_KEY) window.location.reload(); };
    window.addEventListener(ANALYTICS_PREFERENCES, preferences);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener(ANALYTICS_PREFERENCES, preferences); window.removeEventListener('storage', storage); };
  }, [config]);

  useEffect(() => {
    permitted.current = aggregate;
    if (!aggregate) { lastPosthogPage.current = null; return; }
    let cancelled = false;
    void import('posthog-js').then(({ default: ph }) => {
      if (cancelled || !permitted.current) return;
      ph.init(config.posthogKey, {
        api_host: config.posthogHost, cookieless_mode: 'always', person_profiles: 'never',
        autocapture: { dom_event_allowlist: ['click', 'change', 'submit'], element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea', 'label'] },
        capture_pageview: false, capture_pageleave: false,
        disable_session_recording: true, disable_surveys: true, capture_exceptions: false,
        advanced_disable_flags: true, disable_external_dependency_loading: true,
        before_send: (event) => {
          if (!event || !permitted.current || privacySignal()) return null;
          const keep = new Set(['distinct_id', 'token', '$cookieless_mode', '$raw_user_agent', '$host', '$session_id', '$window_id', '$lib', '$lib_version', '$process_person_profile', '$current_url', '$pathname', '$referrer', '$referring_domain', '$device_type', '$device', '$os', '$browser', '$pageview_id', 'page_type']);
          const community = communityProperties(event.properties);
          const support = event.event === 'support_checkout_clicked' ? supportCheckoutProperties(event.properties) : null;
          const store = event.event === 'app_store_badge_clicked' ? storeBadgeProperties(event.properties) : null;
          const participation = event.event === 'participation_step' ? participationProperties(event.properties)
            : event.event === 'participation_failure' ? participationFailureProperties(event.properties) : null;
          if (['participation_step', 'participation_failure'].includes(event.event) && !participation) return null;
          const journeyEvent = (JOURNEY_EVENTS as readonly string[]).includes(event.event);
          const journey = journeyEvent ? journeyProperties(event.event as JourneyEvent, event.properties) : null;
          if (journeyEvent && !journey) return null;
          const previousDuration = event.properties.$prev_pageview_duration;
          event.properties = Object.fromEntries(Object.entries(event.properties).filter(([key]) => keep.has(key)));
          if (community) Object.assign(event.properties, community);
          if (support) Object.assign(event.properties, support);
          if (store) Object.assign(event.properties, store);
          if (participation) Object.assign(event.properties, participation);
          if (journey) Object.assign(event.properties, journey);
          event.properties.workflow_version = WORKFLOW_VERSION;
          const confirmedOutcome = ['report_published', 'contribution_confirmed', 'cleanup_approved'].includes(event.event);
          const page = (event.event === '$pageleave' || participation || journey || confirmedOutcome) && typeof event.properties.page_type === 'string'
            ? analyticsPage(event.properties.page_type) : analyticsPage(window.location.pathname);
          if ((event.event === '$pageleave' || event.event === '$autocapture') && !page) return null;
          // Measure profile visits without collecting automatic clicks on profile content.
          if (page === MEMBER_PROFILE_PAGE && (event.event === '$autocapture' || event.event === '$rageclick')) return null;
          if (event.event === '$pageleave' && page && typeof previousDuration === 'number' && Number.isFinite(previousDuration) && previousDuration >= 0) {
            event.properties.$prev_pageview_pathname = page;
            event.properties.$prev_pageview_duration = previousDuration;
          }
          event.properties.$current_url = `https://litterbugs.app${page ?? '/private'}`;
          event.properties.$pathname = page ?? '/private';
          const origin = analyticsReferrer(document.referrer);
          event.properties.$referrer = origin || '$direct';
          event.properties.$referring_domain = origin ? new URL(origin).hostname : '$direct';
          return event;
        },
      });
      posthog.current = ph;
      setReady(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [aggregate, config]);

  useEffect(() => {
    if (!active) { lastGooglePage.current = null; return; }
    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.dataLayer ??= [];
    // eslint-disable-next-line prefer-rest-params
    analyticsWindow.gtag ??= function () { analyticsWindow.dataLayer!.push(arguments); };
    google('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    google('consent', 'default', { analytics_storage: 'denied', region: CONSENT_REQUIRED_REGIONS });
    if (consent === 'accepted') {
      google('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    }
    google('set', 'send_page_view', false);
    google('js', new Date());
    google('config', config.gaId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: 'https://litterbugs.app/', page_referrer: analyticsReferrer(document.referrer), page_title: 'Litterbugs' });
    // Load the tag only after its initial configuration is queued.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGaConfigured(true);
  }, [active, config, consent]);

  useEffect(() => {
    if (!active || !clarityConfigured) return;
    const analyticsWindow = window as AnalyticsWindow;
    const alreadyLoaded = analyticsWindow.clarity && !analyticsWindow.clarity.q;
    analyticsWindow.clarity ??= Object.assign(function (...args: unknown[]) {
      const queue = analyticsWindow.clarity!.q ??= [];
      // The tag can load before its recorder dependency. Bound our bootstrap
      // too, keeping consent and the bundle tag if that dependency is blocked.
      if (queue.length >= 250) {
        const removable = queue.findIndex(call => call[0] === 'event' || (call[0] === 'set' && call[1] !== 'lb_workflow_version'));
        queue.splice(removable < 0 ? 0 : removable, 1);
      }
      queue.push(args);
    }, { q: [] as unknown[][] });
    const src = `https://www.clarity.ms/tag/${config.clarityId}`;
    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const created = !script && !alreadyLoaded;
    if (created) { script = document.createElement('script'); script.async = true; script.src = src; }
    const loaded = () => {
      if (script) script.dataset.litterbugsLoaded = 'true';
      if (!permitted.current || privacySignal()) return;
      try {
        analyticsWindow.clarity?.('set', 'lb_workflow_version', WORKFLOW_VERSION);
        setClarityReady(true);
      } catch { /* Recording availability must not affect participation. */ }
    };
    // Keep events in our bounded provider queue until Clarity loads. A blocked
    // script must not grow its unbounded bootstrap queue with polling events.
    script?.addEventListener('load', loaded);
    if (alreadyLoaded || script?.dataset.litterbugsLoaded === 'true') loaded();
    if (consent === 'accepted') analyticsWindow.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    if (created && script) document.head.appendChild(script);
    return () => script?.removeEventListener('load', loaded);
  }, [active, clarityConfigured, config.clarityId, consent]);

  useEffect(() => {
    const page = analyticsPage(pathname);
    if (aggregate && ready && lastPosthogPage.current && lastPosthogPage.current.pathname !== pathname) finishPosthogPage();
    if (!page) { lastGooglePage.current = null; return; }
    const community = communityForPath(pathname);
    const context = community ? { community_id: community.slug } : {};
    if (active && gaReady && lastGooglePage.current !== pathname) {
      google('event', 'page_view', { ...context, page_type: page, page_location: `https://litterbugs.app${page}`, page_title: `Litterbugs ${page}`, page_referrer: analyticsReferrer(document.referrer) });
      lastGooglePage.current = pathname;
    }
    if (aggregate && ready && posthog.current && lastPosthogPage.current?.pathname !== pathname) {
      posthog.current.capture('$pageview', { ...context, page_type: page }); lastPosthogPage.current = { pathname, page, started: Date.now() };
    }
  }, [active, aggregate, finishPosthogPage, gaReady, ready, pathname]);

  useEffect(() => {
    if (!aggregate || !ready) return;
    const hide = () => finishPosthogPage(true);
    const show = (event: PageTransitionEvent) => {
      if (!event.persisted || !permitted.current || privacySignal() || !posthog.current) return;
      const pathname = window.location.pathname;
      const page = analyticsPage(pathname);
      if (!page || lastPosthogPage.current) return;
      const community = communityForPath(window.location.pathname);
      const context = community ? { community_id: community.slug } : {};
      posthog.current.capture('$pageview', { ...context, page_type: page });
      lastPosthogPage.current = { pathname, page, started: Date.now() };
    };
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    return () => { window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show); };
  }, [aggregate, finishPosthogPage, ready]);

  useEffect(() => {
    if (!active && !aggregate) { pendingFlowDeliveries.current = []; pendingOutcomeDeliveries.current.clear(); return; }
    const flushParticipation = () => {
      if (!permitted.current || privacySignal()) { pendingFlowDeliveries.current = []; pendingOutcomeDeliveries.current.clear(); return; }
      const enqueue = (event: PendingFlowDelivery['event'], properties: PendingFlowDelivery['properties']) => {
        pendingFlowDeliveries.current.push({ event, properties, posthogSent: false, claritySent: !clarityConfigured || !clarityJourney(event, properties),
          // Shared-report provider handoffs are intentionally PostHog-only.
          googleSent: event === 'shared_report_sign_in' });
      };
      for (const item of drainWebsiteFlows()) {
        enqueue(item.event, item.properties);
      }
      // In-memory, safe properties only; a blocked provider cannot grow this indefinitely.
      if (pendingFlowDeliveries.current.length > 150) pendingFlowDeliveries.current.splice(0, pendingFlowDeliveries.current.length - 150);
      for (const item of pendingFlowDeliveries.current) {
        if (aggregate && ready && posthog.current && !item.posthogSent) {
          try {
            if (immediateFlowDelivery(item.event, item.properties)) posthog.current.capture(item.event, item.properties, { transport: 'sendBeacon', send_instantly: true });
            else posthog.current.capture(item.event, item.properties);
            item.posthogSent = true;
          } catch { /* One unavailable provider must not block the other or the user action. */ }
        }
        if (active && gaReady && !item.googleSent) {
          try { google('event', item.event, item.properties); item.googleSent = true; }
          catch { /* Keep the bounded event for a later readiness/action flush. */ }
        }
        if (active && clarityReady && !item.claritySent) {
          const signal = clarityJourney(item.event, item.properties);
          try {
            const clarity = (window as AnalyticsWindow).clarity;
            if (clarity && signal) {
              for (const [key, value] of Object.entries(signal.tags)) clarity('set', key, value);
              clarity('event', signal.event);
              item.claritySent = true;
            }
          } catch { /* Keep this provider's event without blocking the others. */ }
        }
      }
      pendingFlowDeliveries.current = pendingFlowDeliveries.current.filter(item => !item.googleSent || !item.posthogSent || !item.claritySent);
    };
    const outcome = (raw: Event) => {
      if (!permitted.current || privacySignal()) { pendingOutcomeDeliveries.current.clear(); return; }
      const detail = (raw as CustomEvent).detail;
      if (!detail) return;
      const communityContext = communityProperties(detail) ?? {};
      const currentPage = analyticsPage(window.location.pathname) ?? '/private';
      if (['participation_step', 'participation_failure', ...JOURNEY_EVENTS].includes(detail.event)) {
        flushParticipation();
        return;
      }
      if (detail.event === 'support_checkout_clicked') {
        const support = supportCheckoutProperties(detail);
        if (!support) return;
        if (active && gaReady) google('event', detail.event, { page_type: currentPage, ...support });
        if (aggregate && ready) posthog.current?.capture(detail.event, { page_type: currentPage, ...support });
        return;
      }
      if (COMMUNITY_ENGAGEMENT_EVENTS.includes(detail.event)) {
        if (!('community_id' in communityContext)) return;
        if (active && gaReady) google('event', detail.event, { page_type: currentPage, ...communityContext });
        if (aggregate && ready) posthog.current?.capture(detail.event, { page_type: currentPage, ...communityContext });
        return;
      }
      if (!['report_published', 'contribution_confirmed', 'cleanup_approved'].includes(detail.event) || typeof detail.id !== 'string') return;
      try {
        const key = `litterbugs:analytics-observed:${detail.event}:${detail.id}`;
        const persist = consent === 'accepted';
        if (persist && localStorage.getItem(key)) { pendingOutcomeDeliveries.current.delete(key); return; }
        const seen = (provider: string) => observedOutcomes.current.has(`${key}:${provider}`)
          || (persist && Boolean(localStorage.getItem(`${key}:${provider}`)));
        const remember = (provider: string) => {
          observedOutcomes.current.add(`${key}:${provider}`);
          if (persist) localStorage.setItem(`${key}:${provider}`, '1');
        };
        // Keep the first safe page even if the visitor navigates before a provider loads.
        const delivery = pendingOutcomeDeliveries.current.get(key) ?? {
          event: detail.event, id: detail.id, ...communityContext,
          page_type: typeof detail.page_type === 'string' ? analyticsPage(detail.page_type) ?? '/private' : currentPage,
        };
        pendingOutcomeDeliveries.current.set(key, delivery);
        if (pendingOutcomeDeliveries.current.size > 30) pendingOutcomeDeliveries.current.delete(pendingOutcomeDeliveries.current.keys().next().value!);
        const page = delivery.page_type;
        const context = communityProperties(delivery) ?? {};
        if (active && gaReady && !seen('ga')) {
          try {
            google('event', delivery.event, { ...context, page_type: page, page_location: `https://litterbugs.app${page}`, page_title: 'Litterbugs', page_referrer: analyticsReferrer(document.referrer) }); remember('ga');
          } catch { /* Retain this provider's delivery without blocking the other. */ }
        }
        if (aggregate && ready && posthog.current && !seen('posthog')) {
          try { posthog.current.capture(delivery.event, { ...context, page_type: page }); remember('posthog'); }
          catch { /* Retain this provider's delivery without blocking the user action. */ }
        }
        if (seen('ga') && seen('posthog')) pendingOutcomeDeliveries.current.delete(key);
      } catch { /* Measurement must not interrupt the user action. */ }
    };
    const click = (event: MouseEvent) => {
      if (!permitted.current || privacySignal() || event.defaultPrevented || event.button !== 0) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link) return;
      const store = storeBadgeDestination(link.href);
      const page = analyticsPage(window.location.pathname);
      if (store && page) {
        const instagram = isInstagramStoreVisit(new URLSearchParams(window.location.search).get('utm_source'));
        const properties = { page_type: page, store, ...(instagram ? { campaign: 'instagram' } : {}) };
        if (active && gaReady) google('event', 'app_store_badge_clicked', properties);
        if (aggregate && ready) posthog.current?.capture('app_store_badge_clicked', properties);
      }
      const action = participationLinkAction(new URL(link.href), window.location.origin);
      if (action && page) trackParticipation(action, 'action_tapped', entrySourceForPath(window.location.pathname));
      const slug = link.closest<HTMLElement>('[data-community-slug]')?.dataset.communitySlug;
      const observation = communityClick(link.href, window.location.origin, slug, link.dataset.communityResource);
      if (observation) outcome(new CustomEvent(ANALYTICS_EVENT, { detail: { event: observation.event, ...observation.properties } }));
    };
    flushParticipation();
    for (const detail of [...pendingOutcomeDeliveries.current.values()]) outcome(new CustomEvent(ANALYTICS_EVENT, { detail }));
    for (const detail of drainWebsiteOutcomes()) outcome(new CustomEvent(ANALYTICS_EVENT, { detail }));
    window.addEventListener(ANALYTICS_EVENT, outcome);
    document.addEventListener('click', click, true);
    return () => { window.removeEventListener(ANALYTICS_EVENT, outcome); document.removeEventListener('click', click, true); };
  }, [active, aggregate, ready, gaReady, clarityReady, clarityConfigured, consent]);

  function choose(value: 'accepted' | 'declined') {
    try { localStorage.setItem(ANALYTICS_REPLAY_CHOICE_KEY, value); localStorage.setItem(ANALYTICS_CONSENT_KEY, value); } catch {}
    setConsent(value); setShow(false);
    if (value === 'declined') {
      permitted.current = false;
      pendingFlowDeliveries.current = [];
      pendingOutcomeDeliveries.current.clear();
      drainParticipation();
      drainParticipationFailures();
      drainJourneys();
      clearParticipationContext();
      drainWebsiteOutcomes();
      (window as AnalyticsWindow).clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
      (window as unknown as Record<string, unknown>)[`ga-disable-${config.gaId}`] = true;
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.trim().split('=')[0];
        if (!/^_ga(?:_|$)/.test(name)) continue;
        for (const domain of ['', '; domain=litterbugs.app', '; domain=.litterbugs.app']) {
          document.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax`;
        }
      }
      if (active || ready) window.location.reload();
    }
  }
  return <>
    {active && gaConfigured && <Script id="litterbugs-ga" src={`https://www.googletagmanager.com/gtag/js?id=${config.gaId}`} strategy="afterInteractive" onReady={() => setGaReady(true)} />}
    {show && <section className={styles.panel} aria-label="Analytics choices">
      <h2>Analytics settings</h2>
      {allowed ? <><p>Google Analytics and Microsoft Clarity help us understand visits and may create masked session replays. You can turn analytics off or allow it where permission is required. Your choice is remembered.</p><div className={styles.actions}><button className="secondary-button" onClick={() => choose('declined')}>Turn off analytics</button><button className="primary-button" onClick={() => choose('accepted')}>Allow analytics</button></div></> : <><p>Optional usage tracking is off. You can use every feature without it.</p><button className="secondary-button" onClick={() => setShow(false)}>Close</button></>}
      <p><Link href="/privacy">Privacy policy</Link>. {allowed && 'You can change your choice here anytime.'}</p>
    </section>}
  </>;
}
