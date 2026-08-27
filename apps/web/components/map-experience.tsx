'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  EMPTY_REPORT_DRAFT,
  FALLBACK_MAP_CENTER,
  MAX_REPORT_DISTANCE_MILES,
  hasReportCoordinates,
  isWithinReportDistance,
  reportInsertFromDraft,
  reportUpdateFromDraft,
  type Coordinates,
  type MappableReport,
  type Report,
  type ReportDraft,
} from '@litterbugs/report-contract';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AccountDialog } from '@/components/account-dialog';
import { AuthDialog } from '@/components/auth-dialog';
import { Icon } from '@/components/icon';
import { ReportBrowser } from '@/components/report-browser';
import { canManageReport, realUserId } from '@/lib/report-access';
import { getBrowserLocation } from '@/lib/geolocation';
import { ReportDetail } from '@/components/report-detail';
import { ReportWizard } from '@/components/report-wizard';
import { createClient } from '@/lib/supabase/client';

const MAP_TYPES = ['roadmap', 'satellite', 'hybrid', 'terrain'] as const;
let mapsConfigured = false;

export function MapExperience({
  initialReports,
  initialUserId,
  googleMapsKey,
  googleMapsMapId,
  initialError,
}: {
  initialReports: Report[];
  initialUserId: string | null;
  googleMapsKey: string;
  googleMapsMapId: string;
  initialError: string;
}) {
  const router = useRouter();
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const advancedMarkerRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const mapClickRef = useRef<(coordinates: Coordinates) => void>(() => undefined);
  const [reports, setReports] = useState<MappableReport[]>(initialReports.filter(hasReportCoordinates));
  const [userId, setUserId] = useState(initialUserId);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(
    googleMapsKey && googleMapsMapId
      ? ''
      : 'A restricted Google Maps browser key and web map ID are required to display the map.',
  );
  const [mapTypeIndex, setMapTypeIndex] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [draftCoordinates, setDraftCoordinates] = useState<Coordinates | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editPhotoUrls, setEditPhotoUrls] = useState<string[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [reportListOpen, setReportListOpen] = useState(false);
  const [toast, setToast] = useState('');

  const refreshReports = useCallback(async () => {
    const { data, error } = await createClient()
      .from('reports')
      .select('*')
      .or('status.is.null,status.eq.active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) {
      setToast('Reports could not be refreshed. Check your connection and try again.');
      return;
    }
    const nextReports = (data ?? []).filter(hasReportCoordinates);
    setReports(nextReports);
    setSelectedReport((current) => current
      ? nextReports.find(({ id }) => id === current.id) ?? current
      : null);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(realUserId(data.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = realUserId(session?.user);
      setUserId(nextUser);
      router.refresh();
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!googleMapsKey || !googleMapsMapId || !mapElementRef.current || mapRef.current) return;
    let cancelled = false;

    async function startMap() {
      try {
        if (!mapsConfigured) {
          setOptions({ key: googleMapsKey, v: 'weekly', authReferrerPolicy: 'origin' });
          mapsConfigured = true;
        }
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
        ]);
        if (cancelled || !mapElementRef.current) return;
        const map = new Map(mapElementRef.current, {
          center: { lat: FALLBACK_MAP_CENTER.latitude, lng: FALLBACK_MAP_CENTER.longitude },
          zoom: 12,
          mapId: googleMapsMapId,
          mapTypeId: 'roadmap',
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          minZoom: 3,
        });
        advancedMarkerRef.current = AdvancedMarkerElement;
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) mapClickRef.current({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
        });
        mapRef.current = map;
        setMapReady(true);
        void getBrowserLocation().then((location) => {
          if (!cancelled) {
            map.panTo({ lat: location.latitude, lng: location.longitude });
            map.setZoom(14);
          }
        }).catch(() => {
          if (cancelled || !reports.length) return;
          if (reports.length === 1) {
            map.panTo({ lat: reports[0].latitude, lng: reports[0].longitude });
            map.setZoom(14);
            return;
          }
          const bounds = new google.maps.LatLngBounds();
          reports.forEach((report) => bounds.extend({ lat: report.latitude, lng: report.longitude }));
          map.fitBounds(bounds, 90);
        });
      } catch {
        if (!cancelled) setMapError('Google Maps could not load. Check the browser key and try again.');
      }
    }
    void startMap();
    return () => { cancelled = true; };
  }, [googleMapsKey, googleMapsMapId, reports]);

  useEffect(() => {
    const map = mapRef.current;
    const AdvancedMarkerElement = advancedMarkerRef.current;
    if (!mapReady || !map || !AdvancedMarkerElement) return;
    markersRef.current.forEach((marker) => { marker.map = null; });
    markersRef.current = reports.map((report) => {
      const severity = report.severity?.toLowerCase();
      const color = severity === 'low' ? '#34a853' : severity === 'high' ? '#e5483f' : '#f58a31';
      const markerGlyph = document.createElement('span');
      markerGlyph.className = 'report-map-marker';
      markerGlyph.style.setProperty('--marker-color', color);
      markerGlyph.textContent = '!';
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: report.latitude, lng: report.longitude },
        title: report.title || 'Litter Report',
        gmpClickable: true,
      });
      marker.append(markerGlyph);
      marker.addEventListener('gmp-click', () => setSelectedReport(report));
      return marker;
    });
  }, [mapReady, reports]);

  const beginReport = useCallback(async (coordinates: Coordinates) => {
    if (!userId) {
      setToast('Sign in to submit a litter report. You can keep browsing without an account.');
      setAuthOpen(true);
      return;
    }
    try {
      const location = await getBrowserLocation();
      if (!isWithinReportDistance(location, coordinates)) {
        setToast(`Report location too far away. Reports can only be created within ${MAX_REPORT_DISTANCE_MILES} miles of your current location.`);
        return;
      }
      setDraftCoordinates(coordinates);
    } catch {
      setToast('Litterbugs needs your location to verify that a report is near you. Allow location access and try again.');
    }
  }, [userId]);

  useEffect(() => {
    mapClickRef.current = (coordinates) => { void beginReport(coordinates); };
  }, [beginReport]);

  async function centerOnUser() {
    try {
      const location = await getBrowserLocation();
      mapRef.current?.panTo({ lat: location.latitude, lng: location.longitude });
      mapRef.current?.setZoom(14);
    } catch {
      setToast('Unable to find your location. Check your browser permission and try again.');
    }
  }

  function toggleMapType() {
    const nextIndex = (mapTypeIndex + 1) % MAP_TYPES.length;
    setMapTypeIndex(nextIndex);
    mapRef.current?.setMapTypeId(MAP_TYPES[nextIndex] as google.maps.MapTypeId);
  }

  function openReport(report: MappableReport) {
    setSelectedReport(report);
    setReportListOpen(false);
    mapRef.current?.panTo({ lat: report.latitude, lng: report.longitude });
    if ((mapRef.current?.getZoom() ?? 0) < 14) mapRef.current?.setZoom(14);
  }

  function openReportById(reportId: string) {
    const report = reports.find(({ id }) => id === reportId);
    if (report) openReport(report);
  }

  async function saveReport(draft: ReportDraft) {
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    const authenticatedUserId = realUserId(user);
    if (!authenticatedUserId) {
      setDraftCoordinates(null);
      setEditingReport(null);
      setAuthOpen(true);
      return 'Sign in with a real account to save this report.';
    }

    if (editingReport) {
      const { data, error } = await supabase
        .from('reports')
        .update(reportUpdateFromDraft(draft))
        .eq('id', editingReport.id)
        .eq('user_id', authenticatedUserId)
        .select()
        .single();
      if (error) return `Save failed: ${error.message}`;
      if (!hasReportCoordinates(data)) return 'The saved report is missing its map location.';
      setSelectedReport(data);
      setEditingReport(null);
      setEditPhotoUrls([]);
      await refreshReports();
      setToast('Report saved. Thanks for helping keep the community clean!');
      return null;
    }

    if (!draftCoordinates) return 'Choose a location on the map and try again.';
    const { data: report, error } = await supabase
      .from('reports')
      .insert(reportInsertFromDraft(draft, draftCoordinates, authenticatedUserId))
      .select()
      .single();
    if (error) return `Save failed: ${error.message}`;
    if (!hasReportCoordinates(report)) return 'The saved report is missing its map location.';

    const photoPaths: string[] = [];
    for (const [index, photo] of draft.photos.entries()) {
      const extension = (photo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${authenticatedUserId}/${report.id}/${Date.now()}-${index}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('report_photos').upload(path, photo, {
        contentType: photo.type || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        upsert: false,
      });
      if (!uploadError) photoPaths.push(path);
    }

    if (photoPaths.length) {
      await supabase.from('reports').update({ photo_paths: photoPaths }).eq('id', report.id).eq('user_id', authenticatedUserId);
    }
    setDraftCoordinates(null);
    await refreshReports();
    setToast('Report saved. Thanks for helping keep the community clean!');
    return null;
  }

  async function editSelectedReport() {
    if (!selectedReport || selectedReport.user_id !== userId) return;
    const paths = selectedReport.photo_paths ?? [];
    const signed = await Promise.all(paths.map((path) => createClient().storage.from('report_photos').createSignedUrl(path, 3600)));
    setEditPhotoUrls(signed.flatMap(({ data }) => data?.signedUrl ? [data.signedUrl] : []));
    setEditingReport(selectedReport);
    setSelectedReport(null);
  }

  async function deleteSelectedReport() {
    if (!selectedReport || !userId || selectedReport.user_id !== userId) return;
    const ownerId = userId;
    if (!window.confirm('Delete report? This action cannot be undone.')) return;
    const supabase = createClient();
    if (selectedReport.photo_paths?.length) {
      const { error: storageError } = await supabase.storage.from('report_photos').remove(selectedReport.photo_paths);
      if (storageError) {
        setToast('Delete failed before the report was changed. Check your connection and try again.');
        return;
      }
    }
    const { error } = await supabase.from('reports').delete().eq('id', selectedReport.id).eq('user_id', ownerId);
    if (error) {
      setToast(`Delete failed: ${error.message}`);
      return;
    }
    setSelectedReport(null);
    await refreshReports();
    setToast('Report deleted.');
  }

  const editDraft: ReportDraft = editingReport ? {
    ...EMPTY_REPORT_DRAFT,
    title: editingReport.title ?? '',
    selectedTypes: editingReport.litter_types ?? [],
    types: editingReport.types ?? '',
    severity: editingReport.severity === 'Low' || editingReport.severity === 'Medium' || editingReport.severity === 'High' ? editingReport.severity : '',
    selectedNotes: editingReport.notes_presets ?? [],
    notes: editingReport.notes_other ?? '',
  } : EMPTY_REPORT_DRAFT;

  return (
    <main className="map-page">
      <header className="site-header">
        <Link href="/" className="brand-link" aria-label="Litterbugs home"><Image src="/brand/litterbugs-logo.png" alt="Litterbugs" width={636} height={433} priority /></Link>
        <div className="header-context"><span className="live-dot" />Community litter map</div>
        <button className={userId ? 'account-button' : 'signin-button'} onClick={() => userId ? setAccountOpen(true) : setAuthOpen(true)}>
          {userId && <Icon name="account" />}{userId ? 'Account' : 'Sign in'}
        </button>
      </header>

      <section className="map-stage" aria-label="Litterbugs report map">
        <div ref={mapElementRef} className="google-map" />
        {!mapReady && !mapError && <div className="map-loading"><span className="spinner" /><span>Loading map…</span></div>}
        {mapError && <div className="map-error"><Icon name="warning" /><strong>Map unavailable</strong><span>{mapError}</span></div>}

        <div className="map-guidance"><strong>{userId ? 'Click the map to report litter' : 'Explore active litter reports'}</strong><span>{userId ? 'Reports must be within 10 miles of you.' : 'Sign in when you’re ready to submit.'}</span></div>
        <div className="zoom-controls" aria-label="Map zoom controls">
          <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + 1)} aria-label="Zoom in"><Icon name="plus" /></button>
          <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) - 1)} aria-label="Zoom out"><Icon name="minus" /></button>
        </div>
        <div className="map-action-controls">
          <button onClick={toggleMapType} aria-label={`Change map type. Current: ${MAP_TYPES[mapTypeIndex]}`} title="Change map type"><Icon name="layers" /></button>
          <button onClick={centerOnUser} aria-label="Center map on your location" title="My location"><Icon name="location" /></button>
        </div>

        <div className="severity-legend" aria-label="Report severity legend"><span><i className="legend-low" />Low</span><span><i className="legend-medium" />Medium</span><span><i className="legend-high" />High</span></div>
        <ReportBrowser reports={reports} open={reportListOpen} onToggle={() => setReportListOpen((open) => !open)} onSelect={openReport} />
        {(initialError || toast) && <div className={`toast ${initialError && !toast ? 'toast-warning' : ''}`} role="status">{toast || 'Some reports could not be loaded. The map is still available.'}</div>}
      </section>

      {selectedReport && <ReportDetail key={selectedReport.id} report={selectedReport} userId={userId} isOwner={canManageReport(selectedReport, userId)} onRequireSignIn={() => { setSelectedReport(null); setAuthOpen(true); }} onReportChanged={refreshReports} onClose={() => setSelectedReport(null)} onEdit={() => { void editSelectedReport(); }} onDelete={() => { void deleteSelectedReport(); }} />}
      {draftCoordinates && <ReportWizard initialDraft={{ ...EMPTY_REPORT_DRAFT }} isEditing={false} onClose={() => setDraftCoordinates(null)} onSubmit={saveReport} />}
      {editingReport && <ReportWizard initialDraft={editDraft} isEditing existingPhotoUrls={editPhotoUrls} onClose={() => { setEditingReport(null); setEditPhotoUrls([]); }} onSubmit={saveReport} />}
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
      {accountOpen && <AccountDialog onClose={() => setAccountOpen(false)} onOpenReport={openReportById} onSignedOut={() => { setAccountOpen(false); setUserId(null); }} />}
    </main>
  );
}
