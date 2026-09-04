'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  EMPTY_REPORT_DRAFT,
  FALLBACK_MAP_CENTER,
  NEARBY_REPORT_DISTANCE_MILES,
  getDistanceMiles,
  hasReportCoordinates,
  reportInsertFromDraft,
  reportUpdateFromDraft,
  type Coordinates,
  type MappableReport,
  type Report,
  type ReportDraft,
} from '@litterbugs/report-contract';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/icon';
import { PublicAccountAction, type PublicAccountActionHandle } from '@/components/public-account-action';
import { PublicSiteHeader } from '@/components/public-site-header';
import { ReportBrowser } from '@/components/report-browser';
import { canManageReport, realUserId } from '@/lib/report-access';
import { getBrowserLocation } from '@/lib/geolocation';
import { ReportDetail } from '@/components/report-detail';
import { ReportWizard } from '@/components/report-wizard';
import { readReportPreferences, writeReportPreferences } from '@/lib/report-preferences';
import { uploadSecureBrowserMedia } from '@/lib/secure-media-upload';
import { createClient } from '@/lib/supabase/client';

const MAP_TYPES = ['roadmap', 'satellite', 'hybrid', 'terrain'] as const;
let mapsConfigured = false;

function markerLabel(report: MappableReport) {
  if (report.cleanup_state === 'completed') return 'Done';
  if (report.cleanup_state === 'claimed') return 'Busy';
  if (report.funded_amount_cents > 0) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(report.funded_amount_cents / 100);
  }
  return 'Open';
}

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
  const markerGlyphsRef = useRef(new Map<string, HTMLElement>());
  const accountActionRef = useRef<PublicAccountActionHandle>(null);
  const selectedReportIdRef = useRef<string | null>(null);
  const advancedMarkerRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const mapClickRef = useRef<(coordinates: Coordinates) => void>(() => undefined);
  const [reports, setReports] = useState<MappableReport[]>(initialReports.filter(hasReportCoordinates));
  const [visibleReports, setVisibleReports] = useState<MappableReport[]>(
    initialReports.filter(hasReportCoordinates).filter(({ cleanup_state }) => cleanup_state === 'available'),
  );
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
  const [reportListOpen, setReportListOpen] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [previewedReportId, setPreviewedReportId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [reportPreferences, setReportPreferences] = useState({
    favorites: new Set<string>(),
    hidden: new Set<string>(),
  });

  const refreshReports = useCallback(async () => {
    const { data, error } = await createClient()
      .from('reports')
      .select('*')
      .eq('is_sample', false)
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

  const handleUserChange = useCallback((nextUserId: string | null) => {
    setUserId(nextUserId);
    const stored = readReportPreferences(nextUserId);
    setReportPreferences({ favorites: new Set(stored.favorites), hidden: new Set(stored.hidden) });
    router.refresh();
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = readReportPreferences(userId);
      setReportPreferences({ favorites: new Set(stored.favorites), hidden: new Set(stored.hidden) });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [userId]);

  function updateReportPreference(kind: 'favorites' | 'hidden', reportId: string, enabled: boolean) {
    setReportPreferences((current) => {
      const next = {
        favorites: new Set(current.favorites),
        hidden: new Set(current.hidden),
      };
      if (enabled) next[kind].add(reportId);
      else next[kind].delete(reportId);
      writeReportPreferences(userId, {
        favorites: Array.from(next.favorites),
        hidden: Array.from(next.hidden),
      });
      return next;
    });
    setToast(kind === 'favorites'
      ? enabled ? 'Report added to favorites.' : 'Report removed from favorites.'
      : enabled ? 'Report hidden. Use the Hidden filter to restore it.' : 'Report restored to search.');
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('stripe_onboarding') !== 'return') return;
    url.searchParams.delete('stripe_onboarding');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    const timeout = window.setTimeout(() => accountActionRef.current?.openAccount(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const reportId = url.searchParams.get('report');
    if (!reportId) return;
    const report = reports.find(({ id }) => id === reportId);
    if (!report) return;
    const timeout = window.setTimeout(() => {
      setSelectedReport(report);
      setReportListOpen(false);
      mapRef.current?.panTo({ lat: report.latitude, lng: report.longitude });
      if ((mapRef.current?.getZoom() ?? 0) < 14) mapRef.current?.setZoom(14);
      url.searchParams.delete('report');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [reports]);

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
    markerGlyphsRef.current.clear();
    markersRef.current = visibleReports.map((report) => {
      const markerGlyph = document.createElement('span');
      markerGlyph.className = `report-map-marker${selectedReportIdRef.current === report.id ? ' report-map-marker-selected' : ''}`;
      markerGlyph.textContent = markerLabel(report);
      markerGlyphsRef.current.set(report.id, markerGlyph);
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: report.latitude, lng: report.longitude },
        title: report.title || 'Litter Report',
        gmpClickable: true,
      });
      marker.append(markerGlyph);
      markerGlyph.addEventListener('pointerenter', () => setPreviewedReportId(report.id));
      markerGlyph.addEventListener('pointerleave', () => {
        setPreviewedReportId((current) => current === report.id ? null : current);
      });
      marker.addEventListener('gmp-click', () => {
        setPreviewedReportId(null);
        setSelectedReport(report);
        setReportListOpen(false);
      });
      return marker;
    });
  }, [mapReady, visibleReports]);

  useEffect(() => {
    selectedReportIdRef.current = selectedReport?.id ?? null;
    markerGlyphsRef.current.forEach((glyph, reportId) => {
      glyph.classList.toggle('report-map-marker-selected', reportId === selectedReport?.id);
      glyph.classList.toggle(
        'report-map-marker-previewed',
        reportId === previewedReportId && reportId !== selectedReport?.id,
      );
    });
  }, [previewedReportId, selectedReport?.id]);

  const beginReport = useCallback(async (coordinates: Coordinates) => {
    if (!userId) {
      setToast('Sign in to submit a litter report. You can keep browsing without an account.');
      accountActionRef.current?.openAuth();
      return;
    }
    try {
      const location = await getBrowserLocation();
      if (getDistanceMiles(location, coordinates) > NEARBY_REPORT_DISTANCE_MILES) {
        setToast(`For a location more than ${NEARBY_REPORT_DISTANCE_MILES} miles away, use the Litterbugs mobile app to confirm the pin and complete its location review.`);
        return;
      }
      setDraftCoordinates(coordinates);
      setReportMode(false);
    } catch {
      setToast('Litterbugs needs your location to compare it with the selected report pin. Allow location access and try again.');
    }
  }, [userId]);

  useEffect(() => {
    mapClickRef.current = (coordinates) => {
      if (reportMode) void beginReport(coordinates);
    };
  }, [beginReport, reportMode]);

  function toggleReportMode() {
    if (!userId) {
      accountActionRef.current?.openAuth();
      return;
    }
    setReportMode((current) => !current);
  }

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
      accountActionRef.current?.openAuth();
      return 'Sign in with a real account to save this report.';
    }

    const uploadReportPhotos = async (reportId: string) => {
      const paths: string[] = [];
      for (const photo of draft.photos) {
        try {
          const path = await uploadSecureBrowserMedia({
            supabase,
            userId: authenticatedUserId,
            kind: 'report',
            file: photo,
            subjectId: reportId,
          });
          paths.push(path);
        } catch (error) {
          if (paths.length) await supabase.storage.from('report_photos').remove(paths);
          return {
            paths: [] as string[],
            error: error instanceof Error
              ? error.message
              : 'One or more photos could not be uploaded. Check your connection and try again.',
          };
        }
      }
      return { paths, error: '' };
    };

    if (editingReport) {
      const existingPhotoPaths = editingReport.photo_paths ?? [];
      if (!existingPhotoPaths.length && !draft.photos.length) {
        return 'Add at least one clear photo before saving this report.';
      }
      const uploaded = draft.photos.length
        ? await uploadReportPhotos(editingReport.id)
        : { paths: [] as string[], error: '' };
      if (uploaded.error) return uploaded.error;
      const photoPaths = existingPhotoPaths.length ? existingPhotoPaths : uploaded.paths;
      const { data, error } = await supabase
        .from('reports')
        .update({ ...reportUpdateFromDraft(draft), photo_paths: photoPaths })
        .eq('id', editingReport.id)
        .eq('user_id', authenticatedUserId)
        .select()
        .single();
      if (error) {
        if (uploaded.paths.length) await supabase.storage.from('report_photos').remove(uploaded.paths);
        return `Save failed: ${error.message}`;
      }
      if (!hasReportCoordinates(data)) return 'The saved report is missing its map location.';
      setSelectedReport(data);
      setEditingReport(null);
      setEditPhotoUrls([]);
      await refreshReports();
      setToast('Report saved. Thanks for helping keep the community clean!');
      return null;
    }

    if (!draftCoordinates) return 'Choose a location on the map and try again.';
    if (!draft.photos.length) return 'Add at least one clear photo before saving this report.';
    const reportId = crypto.randomUUID();
    // The media processor verifies that the destination report belongs to the
    // caller, so create the report row before sending its photos through the
    // quarantine pipeline. Roll the empty row back if any later step fails.
    const { data: createdReport, error: createError } = await supabase
      .from('reports')
      .insert({
        ...reportInsertFromDraft(draft, draftCoordinates, authenticatedUserId),
        id: reportId,
        photo_paths: [],
      })
      .select()
      .single();
    if (createError) return `Save failed: ${createError.message}`;

    const uploaded = await uploadReportPhotos(reportId);
    if (uploaded.error) {
      await supabase.from('reports').delete().eq('id', reportId).eq('user_id', authenticatedUserId);
      return uploaded.error;
    }
    const { data: report, error } = await supabase
      .from('reports')
      .update({ photo_paths: uploaded.paths })
      .eq('id', reportId)
      .eq('user_id', authenticatedUserId)
      .select()
      .single();
    if (error) {
      await supabase.storage.from('report_photos').remove(uploaded.paths);
      await supabase.from('reports').delete().eq('id', reportId).eq('user_id', authenticatedUserId);
      return `Save failed: ${error.message}`;
    }
    if (!hasReportCoordinates(report)) {
      await supabase.from('reports').delete().eq('id', createdReport.id).eq('user_id', authenticatedUserId);
      await supabase.storage.from('report_photos').remove(uploaded.paths);
      return 'The saved report is missing its map location.';
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
      <PublicSiteHeader
        activePath="/"
        action={(
          <div className="map-header-actions">
            <button
              type="button"
              className={`header-report-button${reportMode ? ' header-report-button-active' : ''}`}
              onClick={toggleReportMode}
              aria-label={reportMode ? 'Cancel reporting' : 'Report litter'}
              aria-pressed={reportMode}
            >
              {reportMode ? (
                <span aria-hidden>Cancel</span>
              ) : (
                <>
                  <span className="header-report-long" aria-hidden>Report litter</span>
                  <span className="header-report-short" aria-hidden>Report</span>
                </>
              )}
            </button>
            <PublicAccountAction
              ref={accountActionRef}
              initialUserId={initialUserId}
              onAccountDataChanged={refreshReports}
              onOpenReport={openReportById}
              onUserChange={handleUserChange}
            />
          </div>
        )}
      />

      <div className="map-workspace">
        <ReportBrowser
          reports={reports}
          open={reportListOpen}
          onToggle={() => setReportListOpen((open) => !open)}
          onSelect={openReport}
          onPreviewReport={setPreviewedReportId}
          onVisibleReportsChange={setVisibleReports}
          previewedReportId={previewedReportId}
          selectedReportId={selectedReport?.id}
          favoriteReportIds={reportPreferences.favorites}
          hiddenReportIds={reportPreferences.hidden}
        />
        <section className={`map-stage${reportMode ? ' map-stage-reporting' : ''}`} aria-label="Litterbugs report map">
          <div ref={mapElementRef} className="google-map" />
          {!mapReady && !mapError && <div className="map-loading"><span className="spinner" /><span>Loading map…</span></div>}
          {mapError && <div className="map-error"><Icon name="warning" /><strong>Map unavailable</strong><span>{mapError}</span></div>}

          <div className="zoom-controls" aria-label="Map zoom controls">
            <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + 1)} aria-label="Zoom in"><Icon name="plus" /></button>
            <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) - 1)} aria-label="Zoom out"><Icon name="minus" /></button>
          </div>
          <div className="map-action-controls">
            <button onClick={toggleMapType} aria-label={`Change map type. Current: ${MAP_TYPES[mapTypeIndex]}`} title="Change map type"><Icon name="layers" /></button>
            <button onClick={centerOnUser} aria-label="Center map on your location" title="My location"><Icon name="location" /></button>
          </div>

          {(initialError || toast) && <div className={`toast ${initialError && !toast ? 'toast-warning' : ''}`} role="status">{toast || 'Some reports could not be loaded. The map is still available.'}</div>}
        </section>
      </div>

      {selectedReport && <ReportDetail key={selectedReport.id} report={selectedReport} userId={userId} isOwner={canManageReport(selectedReport, userId)} favorite={reportPreferences.favorites.has(selectedReport.id)} hidden={reportPreferences.hidden.has(selectedReport.id)} onFavoriteChange={(favorite) => updateReportPreference('favorites', selectedReport.id, favorite)} onHiddenChange={(hidden) => updateReportPreference('hidden', selectedReport.id, hidden)} onNotify={setToast} onRequireSignIn={() => { setSelectedReport(null); accountActionRef.current?.openAuth(); }} onReportChanged={refreshReports} onClose={() => setSelectedReport(null)} onEdit={() => { void editSelectedReport(); }} onDelete={() => { void deleteSelectedReport(); }} />}
      {draftCoordinates && <ReportWizard initialDraft={{ ...EMPTY_REPORT_DRAFT }} isEditing={false} onClose={() => setDraftCoordinates(null)} onSubmit={saveReport} />}
      {editingReport && <ReportWizard initialDraft={editDraft} isEditing existingPhotoUrls={editPhotoUrls} onClose={() => { setEditingReport(null); setEditPhotoUrls([]); }} onSubmit={saveReport} />}
    </main>
  );
}
