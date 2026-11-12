import { userMessage } from './lib/userMessage';
import { trackParticipation, trackParticipationFailure } from './lib/analytics';
import { requireReportLocation } from './lib/reportLocationCheck';
import { publishReportDraft, clearReportSubmission } from './lib/reportSubmissionStore';
import ReportDetailsSheet from './components/ReportDetailsSheet';
import styles from './styles/MapScreen.styles';
import { cloudDrafts } from './lib/cloudDrafts';
import CloudDraftStatus from './components/CloudDraftStatus';
import ReportWizardModal from './components/ReportWizardModal';
import MapControls from './components/MapControls';

import MapReportPreview from './components/MapReportPreview';
import MapPin, { PinPlaceholder, pinCenterOffset, pinKind } from './components/MapPin';
import PinLanding from './components/PinLanding';
import usePinLandings from './lib/usePinLandings';
import useNearbyReportAlerts from './lib/useNearbyReportAlerts';
import { nearbyAlertRegion } from './lib/nearbyReportAlerts';
import { prefersReducedMotion } from './lib/reduceMotion';
import MapKey, { mapKeyCounts } from './components/MapKey';
import SlideUp from './components/SlideUp';
import { hapticSuccess } from './lib/haptics';
import { showFlowDone } from './components/FlowDone';
import { CALM_MAP_STYLE } from './lib/calmMapStyle';

import { saveReportDraft, loadReportDraft, clearReportDraft } from './lib/savedReportDraft';
import ReportFilters from './components/ReportFilters';
// MapScreen.js
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, Alert, Animated, Easing, useWindowDimensions } from 'react-native';
import { polygonParts } from './lib/searchGeography';
import { Marker, Polygon } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { calculateBBox, returnMapZoom } from 'react-native-map-clustering/lib/helpers';
import { regionForGroup } from './lib/clusterZoom';
import { regionWithPointAt, SELECTED_PIN_HEIGHT } from './lib/mapFraming';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';

import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandedLoadingState from './BrandedLoadingState';
import { supabase } from './lib/supabase'
import {
  canEditOrDeleteReport,
  canManageReport,
  isPermanentUser,
  permanentUserId,
} from './lib/reportAccess';
import { BOTTOM_NAV_METRICS, getBottomNavClearance } from './lib/navigationLayout';
import { isCleanupAvailable } from './lib/cleanupEligibility';
import { getDistanceMiles as reportDistanceMiles, useReports } from './lib/reports';
import { useSession } from './lib/session';


import CleanupWaiverModal from './CleanupWaiverModal';

import { canOfferCleanup, cleanupStatusPresentation, isCleanupInProgress, isCurrentCleaner } from './lib/cleanupEligibility';
import { useProfile } from './lib/profile';
import { requestGeminiReview } from './lib/funding';
import { parseContributionAmount } from './lib/fundingMath';
import { savePendingReportFunding } from './lib/pendingReportFunding';
import {
  createPayoutWorkflow,
} from './lib/payoutWorkflowGate';
import { hasRequiredReportPhoto } from './lib/reportDraft';
import { normalizeReportTitle } from './lib/reportTitle';
import { mergeReportPhotoUris, reportCameraPickerOptions, reportPhotoPickerOptions } from './lib/reportPhotoSelection';
import { uploadReportPhotos } from './lib/uploadReportPhotos';
import {
  isPhotoOptimizationAvailable,
  preparePhotoForSafetyScan,
} from './lib/photoSafetyPreparation';
import {
  findResponsiveUserLocation,
  mapRegionsAreEquivalent,
  reportLocationRegion,
  userLocationRegion,
} from './lib/responsiveLocation';
import { mapCenterCoordinate } from './lib/reportLocationPlacement';
import { formatMapFundingLabel } from './lib/mapFundingMarker';
import {
  clusterStatusCounts,
  reportMarkerPresentation,
} from './lib/mapMarkerPresentation';


import { isReportShareable } from './lib/reportSharing';
import useReportSharing from './lib/useReportSharing';
import useCleanupFlow from './lib/useCleanupFlow';
import { useCleanupFeatureFlags, useCleanupNoticePrompt, usePhotoPreparationNotice, useReportFundingFeedback, useReportKeyboard } from './lib/mapScreenHooks';
import useReportWizardNavigation from './lib/useReportWizardNavigation';
import useSelectedReportLoaders from './lib/useSelectedReportLoaders';
import { promptCleanupNavigation } from './lib/promptCleanupNavigation';
import { showLocationSettingsAlert, showPermanentAccountRequired } from './lib/mapAlerts';
import { colors } from './lib/theme';


// State Functions
export default function MapScreen({ route, navigation, onLaunchReady }) {
  const isMapScreenFocused = useIsFocused();
  const reopenReportOnFocus = useRef(false);
  const [reportOpenRevision, setReportOpenRevision] = useState(0);
  useEffect(() => {
    if (isMapScreenFocused && reopenReportOnFocus.current && !route?.params?.editPhotos) {
      reopenReportOnFocus.current = false;
      setDetailsOpen(true);
      setReportOpenRevision(value => value + 1);
    }
  }, [isMapScreenFocused, route?.params?.editPhotos]);
  const [tracksReportMarkers, setTracksReportMarkers] = useState(true);
  const reportMarkerTrackingTimerRef = useRef(null);
  const reportClusterRef = useRef(null);

  const [draftCoord, setDraftCoord] = useState(null);
  const [reportPlacementActive, setReportPlacementActive] = useState(false);
  const editingDraftLocationRef = useRef(false);
  const [placementCoordinate, setPlacementCoordinate] = useState(null);
  const reportControlTransition = useRef(new Animated.Value(0)).current;
  const [formOpen, setFormOpen] = useState(false);
  const { reportKeyboardVisible, reportKeyboardHeight } = useReportKeyboard(formOpen);
  const reportWizardScrollRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    selectedTypes: [],
    types: '',
    photos: [],   // 👈 we'll use this
    severity: '',
    selectedNotes: [],
    notes: '',
    startingFundingChoice: 'none',
    startingFundingOther: '',
  });
  const [mapType, setMapType] = useState('standard');
  const [selectedReport, setSelectedReport] = useState(null);
  const [mapUserLocation, setMapUserLocation] = useState(null);
  const [nearbyIds, setNearbyIds] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // The report just filed: its pin is carried in by the dragonfly instead of landing.
  const [postedPinId, setPostedPinId] = useState(null);
  // Website pin arrival, iPhone only (Android draws map pins from still snapshots).
  const pinLandings = Platform.OS === 'ios' && !prefersReducedMotion();
  const [reportPhotoUrls, setReportPhotoUrls] = useState([]);
  const [editingReportId, setEditingReportId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const submissionLock = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStage, setSaveStage] = useState('Saving report…');
  const [photoPreparationStatus, setPhotoPreparationStatus] = useState(null);
  const {
    reportStep,
    setReportStep,
    returnToReview,
    isTransitioning,
    stepTranslateX,
    stepOpacity,
    resetReportWizard,
    canAdvanceFromStep,
    goToNextReportStep,
    goToPreviousReportStep,
    jumpToReportStep,
    reportStepPanResponder,
  } = useReportWizardNavigation({ form, isEditing, selectedReport, photoPreparationStatus });
  const { showPhotoPreparation, isPreparingPhotos } = usePhotoPreparationNotice(photoPreparationStatus);
  const [isCentering, setIsCentering] = useState(false);
  const [isLocatingReportLocation, setIsLocatingReportLocation] = useState(false);
  const [isCheckingReportLocation, setIsCheckingReportLocation] = useState(false);
  const reportLocationCheckRef = useRef(null);
  const mapViewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapSurfaceLoaded, setMapSurfaceLoaded] = useState(false);
  const [showInitialMapLoading, setShowInitialMapLoading] = useState(true);
  const [initialLocationResolved, setInitialLocationResolved] = useState(false);
  const initialLocationRequestStartedRef = useRef(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [cleanupWaiver, setCleanupWaiver] = useState(null);
  const [cleanupWaiverOpen, setCleanupWaiverOpen] = useState(false);
  const [cleanupWaiverQueued, setCleanupWaiverQueued] = useState(false);
  const [reportReopenQueued, setReportReopenQueued] = useState(false);
  const [cleanupActionBusy, setCleanupActionBusy] = useState(false);
  const [selectedCleanupAttempt, setSelectedCleanupAttempt] = useState(null);
  const [cleanupAttemptLoading, setCleanupAttemptLoading] = useState(false);
  const [completedCleanupImpact, setCompletedCleanupImpact] = useState(null);
  const [completedCleanupImpactLoading, setCompletedCleanupImpactLoading] = useState(false);
  const [completedCleanupImpactError, setCompletedCleanupImpactError] = useState(null);
  const [completedCleanupImpactReloadKey, setCompletedCleanupImpactReloadKey] = useState(0);
  const {
    reportShareSheetOpen,
    setReportShareSheetOpen,
    reportShareBusyAction,
    shareMapReport,
    shareSelectedReport,
    shareSelectedReportLink,
    shareSelectedReportToInstagram,
  } = useReportSharing({ selectedReport, detailsOpen, completedCleanupImpact, reportPhotoUrls });
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const { paymentsEnabled, geminiReviewEnabled } = useCleanupFeatureFlags();
  const [pendingPayoutWorkflowToken, setPendingPayoutWorkflowToken] = useState(null);
  const [payoutGateBusy, setPayoutGateBusy] = useState(false);
  // Report detail photo carousel

  const { user: currentUser } = useSession();
  const {
    profile: currentProfile,
    blockedIds,
    pendingAction, setPendingAction,
    pendingReportCoordinate,
    setPendingReportCoordinate,
    consumePendingReportCoordinate,
    refreshProfile,
  } = useProfile();
  const {
    favoriteIds, toggleFavorite, favoritesReady, hiddenIds, toggleHidden,
    markers,
    restoredMap, searchPlace, clearSearchPlace, selectedMapReportId: previewId, setSelectedMapReportId: setPreviewId,
    mapRegion: region,
    setMapRegion: setRegion,
    commitMapRegion,
    loading: reportsLoading,
    error: reportsError,
    refreshReports,
    getReportById,
    getReportPhotoUrl,
    upsertReport,
    removeReport,
  } = useReports();
  const pins = usePinLandings({ enabled: pinLandings, mapRef: mapViewRef, region, hidden: showInitialMapLoading, postedPinId });
  const currentUserId = permanentUserId(currentUser);
  // The daily "New litter near you" alert: asked once here, with nothing else on screen.
  useNearbyReportAlerts({
    userId: currentUserId,
    location: locationPermissionGranted ? mapUserLocation : null,
    canAsk: isMapScreenFocused && !showInitialMapLoading && !previewId && !reportPlacementActive && !detailsOpen && !formOpen,
  });
  const reportFundingFeedback = useReportFundingFeedback({ geminiReviewEnabled, currentUserId, selectedReport });
  const [draftSaveError, setDraftSaveError] = useState(false);
  useEffect(() => {
    if (!formOpen || isEditing || !currentUserId || !draftCoord || isSaving || cloudDrafts.status(currentUserId, 'report') === 'submitting') return undefined;
    const timer = setTimeout(() => {
      saveReportDraft(currentUserId, { form, coordinate: draftCoord, step: reportStep })
        .then(() => setDraftSaveError(false)).catch(() => setDraftSaveError(true));
    }, 350);
    return () => clearTimeout(timer);
  }, [form, formOpen, isEditing, currentUserId, draftCoord, reportStep, isSaving]);

  const fundingEnabled = paymentsEnabled && geminiReviewEnabled;

  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight, fontScale } = useWindowDimensions();
  const previewReport = markers.find((marker) => marker.id === previewId)?.report;
  const [previewControlsHidden, setPreviewControlsHidden] = useState(Boolean(previewReport));
  useEffect(() => {
    if (previewReport) {
      setPreviewControlsHidden(true);
      return undefined;
    }
    const timer = setTimeout(() => setPreviewControlsHidden(false), 180);
    return () => clearTimeout(timer);
  }, [previewReport]);
  const nearbyReports = nearbyIds.map((id) => markers.find((marker) => marker.id === id)?.report).filter(Boolean);
  const chooseMapReport = (report) => {
    setNearbyIds([]);
    setPreviewId(report.id);
    const marker = markers.find((item) => item.id === report.id);
    // Bring the pin into the open map above the report card (which covers the middle of the
    // screen), so it stays in sight next to its card instead of hiding behind it.
    if (marker) mapViewRef.current?.animateToRegion(regionWithPointAt(region, marker.coordinate, SELECTED_PIN_HEIGHT * screenHeight, screenHeight), 240);
  };
  const bottomNavClearance = getBottomNavClearance(insets.bottom);

  const locateAndCenterMap = useCallback(async ({
    showPermissionAlert = true,
    requestPermission = true,
    permissionMessage = 'Allow location access to center the map on your position.',
    regionForPosition = userLocationRegion,
    accuracy = Location.Accuracy.Balanced,
    freshLocationTimeoutMs = 8_000,
    animateOnPosition = true,
  } = {}) => {
    let permission = await Location.getForegroundPermissionsAsync();

    if (requestPermission && permission.status !== 'granted' && permission.canAskAgain !== false) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') {
      if (showPermissionAlert) showLocationSettingsAlert(permissionMessage);
      return null;
    }

    setLocationPermissionGranted(true);
    let latestRegion = null;
    const result = await findResponsiveUserLocation({
      locationApi: Location,
      accuracy,
      onPosition: (position) => {
        setMapUserLocation(position.coords);
        const nextRegion = regionForPosition(position);
        latestRegion = nextRegion;
        if (animateOnPosition) {
          mapViewRef.current?.animateToRegion?.(nextRegion, 240);
          commitMapRegion(nextRegion);
        }
      },
      freshLocationTimeoutMs,
    });

    return latestRegion ?? regionForPosition(result.location);
  }, [commitMapRegion]);

  useEffect(() => {
    if (initialLocationRequestStartedRef.current) return undefined;
    initialLocationRequestStartedRef.current = true;
    if (restoredMap) {
      setInitialLocationResolved(true);
      Location.getForegroundPermissionsAsync().then(permission => setLocationPermissionGranted(permission.status === 'granted')).catch(() => {});
      return undefined;
    }
    let active = true;

    locateAndCenterMap({ showPermissionAlert: false, requestPermission: false })
      .catch((error) => console.log('Initial map location error:', error))
      .finally(() => {
        if (active) setInitialLocationResolved(true);
      });

    return () => {
      active = false;
    };
  }, [locateAndCenterMap, restoredMap]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: showInitialMapLoading ? { display: 'none' } : undefined,
    });
  }, [navigation, showInitialMapLoading]);

  useEffect(() => {
    const transition = Animated.timing(reportControlTransition, {
      toValue: reportPlacementActive ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    transition.start();
    return () => transition.stop();
  }, [reportControlTransition, reportPlacementActive]);

  useEffect(() => navigation.addListener('blur', () => {
    reportLocationCheckRef.current = null;
    setIsCheckingReportLocation(false);
    setReportPlacementActive(false);
    setPlacementCoordinate(null);
  }), [navigation]);

  useEffect(() => {
    if (!mapReady || mapSurfaceLoaded) return undefined;

    // Apple Maps does not emit onMapLoaded. Keep the branded transition in
    // place briefly, then use onMapReady as a guarded fallback so startup can
    // never become trapped behind the loading screen.
    const fallback = setTimeout(() => setMapSurfaceLoaded(true), 4000);
    return () => clearTimeout(fallback);
  }, [mapReady, mapSurfaceLoaded]);

  useEffect(() => {
    if (!mapSurfaceLoaded || reportsLoading || !initialLocationResolved) return undefined;

    onLaunchReady?.();
    setShowInitialMapLoading(false);
    return undefined;
  }, [initialLocationResolved, mapSurfaceLoaded, onLaunchReady, reportsLoading]);

  const mapControlsBottom = bottomNavClearance + BOTTOM_NAV_METRICS.mapControlGap;
  const reportControlWidth = fontScale > 1.5
    ? screenWidth - 32
    : reportPlacementActive || isLocatingReportLocation
      ? Math.min(screenWidth - 100, 194 + 120 * (fontScale - 1))
      : Math.max(168, Math.min(screenWidth - 148, 64 + 112 * fontScale)); // website: min-width 168
  // Leave 20px margin on each side of the main report photo
  const reportHeroWidth = Math.max(screenWidth - 40, 280);

  useCleanupNoticePrompt({ currentUserId, refreshReports, navigation });

  useEffect(() => {
    if (!cleanupWaiverQueued || detailsOpen) return undefined;

    const timer = setTimeout(() => {
      setCleanupWaiverQueued(false);
      setCleanupWaiverOpen(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [cleanupWaiverQueued, detailsOpen]);

  useEffect(() => {
    if (!reportReopenQueued || cleanupWaiverOpen) return undefined;

    const timer = setTimeout(() => {
      setReportReopenQueued(false);
      if (selectedReport) setDetailsOpen(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [cleanupWaiverOpen, reportReopenQueued, selectedReport]);



  // =============================
// Multi-step Report Form
// =============================

const hasAttachedReportPhoto = () => (
  hasRequiredReportPhoto({
    photoUris: form.photos,
    existingPhotoPaths: selectedReport?.photo_paths,
    isEditing,
  })
);

const startingFundingAmount = form.startingFundingChoice === 'other'
  ? form.startingFundingOther
  : form.startingFundingChoice;
const hasStartingFundingChoice = !fundingEnabled
  || isEditing
  || Boolean(form.startingFundingChoice);
const wantsStartingFunding = fundingEnabled
  && !isEditing
  && hasStartingFundingChoice
  && form.startingFundingChoice !== 'none';
const startingContributionCents = wantsStartingFunding
  ? parseContributionAmount(startingFundingAmount)
  : null;

// The pin identifies the litter; fresh device GPS checks that it is nearby.
const beginReportAtCoordinate = (coord, savedForm = null, savedStep = 0, missingPhotoCount = 0) => {
  if (!navigation.isFocused()) return;
  const selectedCoordinate = mapCenterCoordinate(coord);
  if (!selectedCoordinate) {
    Alert.alert('Map location unavailable', 'Choose a report location on the map and try again.');
    return;
  }
  editingDraftLocationRef.current = false;
  setDraftCoord(selectedCoordinate);
  setForm(savedForm || {
    title: '', selectedTypes: [], types: '', photos: [], severity: '',
    selectedNotes: [], notes: '', startingFundingChoice: 'none', startingFundingOther: '',
  });
  resetReportWizard();
  setReportStep(savedStep);
  if (missingPhotoCount) Alert.alert('Add your photo again', 'A saved photo is no longer on this device. Your other answers have been kept.');
  setFormOpen(true);
};

useEffect(() => {
  if (!route?.params?.resumeDraft || !navigation.isFocused()) return;
  navigation.setParams({ resumeDraft: undefined });
  loadReportDraft(currentUserId).then(saved => {
    if (saved && navigation.isFocused()) beginReportAtCoordinate(saved.coordinate, saved.form, saved.step, saved.missingPhotoCount);
  }).catch(() => Alert.alert('Draft unavailable', 'Please try opening your draft again.'));
}, [route?.params?.resumeDraft, currentUserId, navigation]);

const openReportLocationPicker = async (skipDraft = false) => {
  editingDraftLocationRef.current = false;
  if (skipDraft !== true) trackParticipation('report', 'action_tapped');
  if (skipDraft !== true && currentUserId) {
    try {
      const saved = await loadReportDraft(currentUserId);
      if (saved) {
        Alert.alert('Resume your report?', 'Resume your saved details, photos, and chosen report location. Account sync status is shown inside the draft.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start new', style: 'destructive', onPress: async () => { try { await clearReportDraft(currentUserId); openReportLocationPicker(true); } catch(error) { Alert.alert('Draft kept', error.message || 'Check your connection and try again.'); } } },
          { text: 'Resume draft', onPress: () => beginReportAtCoordinate(saved.coordinate, saved.form, saved.step, saved.missingPhotoCount) },
        ]);
        return;
      }
    } catch { Alert.alert('Draft unavailable', 'Your saved report could not be loaded. Please try again.'); return; }
  }
  if (!navigation.isFocused()) return;
  const initialCoordinate = mapCenterCoordinate(region);
  if (!initialCoordinate) {
    Alert.alert('Map location unavailable', 'Move the map and try again.');
    return;
  }
  if (!isPermanentUser(currentUser)) {
    setPendingAction(null);
    setPendingReportCoordinate(initialCoordinate);
    navigation.getParent()?.navigate('Auth');
    return;
  }

  let placementRegion = mapUserLocation
    ? reportLocationRegion({ coords: mapUserLocation })
    : region;
  if (!mapUserLocation) {
    setIsLocatingReportLocation(true);
    try {
      const locatedRegion = await locateAndCenterMap({
        permissionMessage: 'Allow location access to begin a report near your current position.',
        regionForPosition: reportLocationRegion,
        accuracy: Location.Accuracy.Balanced,
        freshLocationTimeoutMs: 4_000,
        animateOnPosition: false,
      });
      if (locatedRegion) placementRegion = locatedRegion;
    } catch (error) {
      console.log('Report location centering error:', error);
      Alert.alert(
        'Current location unavailable',
        'Move the pin to the litter location. Location access and a fresh GPS reading within 50 miles are required to confirm it.',
      );
    } finally {
      setIsLocatingReportLocation(false);
    }
  }
  if (!navigation.isFocused()) return;
  const coord = mapCenterCoordinate(placementRegion);
  if (!coord) {
    Alert.alert('Map location unavailable', 'Move the map and try again.');
    return;
  }
  setSelectedReport(null);
  setDetailsOpen(false);
  setPreviewId(null);
  mapViewRef.current?.animateToRegion?.(placementRegion, 280);
  commitMapRegion(placementRegion);
  setPlacementCoordinate(coord);
  setReportPlacementActive(true);
};

const changeDraftLocation = () => {
  editingDraftLocationRef.current = true;
  setFormOpen(false);
  setPlacementCoordinate(draftCoord);
  setReportPlacementActive(true);
  const nextRegion = { ...region, ...draftCoord };
  commitMapRegion(nextRegion);
  mapViewRef.current?.animateToRegion(nextRegion, 240);
};

const cancelReportLocationPicker = () => {
  reportLocationCheckRef.current = null;
  setIsCheckingReportLocation(false);
  setReportPlacementActive(false);
  setPlacementCoordinate(null);
  if (editingDraftLocationRef.current) {
    editingDraftLocationRef.current = false;
    setFormOpen(true);
  }
};

const confirmReportLocation = async () => {
  if (reportLocationCheckRef.current) return;
  const coord = placementCoordinate || mapCenterCoordinate(region);
  if (!coord) {
    Alert.alert('Map location unavailable', 'Move the map and try again.');
    return;
  }

  const request = {};
  reportLocationCheckRef.current = request;
  setIsCheckingReportLocation(true);
  try {
    await requireReportLocation(Location, coord);
    if (reportLocationCheckRef.current !== request || !navigation.isFocused()) return;
    trackParticipation('report', 'location_confirmed');
    setReportPlacementActive(false);
    setPlacementCoordinate(null);
    if (editingDraftLocationRef.current) {
      editingDraftLocationRef.current = false;
      setDraftCoord(coord);
      setFormOpen(true);
    } else {
      beginReportAtCoordinate(coord);
    }
  } catch (error) {
    if (reportLocationCheckRef.current === request && navigation.isFocused()) {
      const message = String(error?.message ?? '');
      trackParticipationFailure('report', 'location_confirmed', /Allow location/i.test(message) ? 'location_denied'
        : /50 miles/i.test(message) ? 'location_out_of_range' : /fresh location/i.test(message) ? 'location_stale' : 'location_unavailable');
      Alert.alert('Choose a nearby report location', userMessage(error, 'Your current location could not be checked. Please try again.'));
    }
  } finally {
    if (reportLocationCheckRef.current === request) {
      reportLocationCheckRef.current = null;
      setIsCheckingReportLocation(false);
    }
  }
};

useEffect(() => {
  if (!isMapScreenFocused || !currentUserId || !pendingReportCoordinate) return;
  const coordinate = consumePendingReportCoordinate();
  if (coordinate) {
    setPlacementCoordinate(coordinate);
    setReportPlacementActive(true);
    mapViewRef.current?.animateToRegion?.({
      ...region,
      ...coordinate,
    }, 240);
  }
}, [currentUserId, isMapScreenFocused, pendingReportCoordinate]);

useEffect(() => navigation.addListener('focus', () => {
  if (!isPermanentUser(currentUser)) { setPendingReportCoordinate(null); setPendingAction(null); }
}), [currentUser, navigation, setPendingReportCoordinate, setPendingAction]);

const reconcileReportAfterBlockedMutation = async (reportId) => {
  try {
    const latestReport = await getReportById(reportId);
    if (latestReport) upsertReport(latestReport);
    else removeReport(reportId);
    return latestReport;
  } catch (error) {
    console.log('Report reconciliation error:', error);
    await refreshReports({ showRefresh: false });
    return null;
  }
};

const refreshReportAfterFundingReview = (reportId, logLabel) => {
  requestGeminiReview({ reportId })
    .then(async () => {
      const reviewedReport = await getReportById(reportId);
      if (reviewedReport) upsertReport(reviewedReport);
    })
    .catch((reviewError) => {
      console.log(logLabel, reviewError);
    });
};

const openPayoutSetupForWorkflow = (action) => {
  const parentNavigation = navigation.getParent();
  if (!parentNavigation) {
    Alert.alert('Payout setup unavailable', 'Please try again from the Profile screen.');
    return false;
  }

  const workflowToken = createPayoutWorkflow(action);
  setPendingPayoutWorkflowToken(workflowToken);

  setDetailsOpen(false);

  parentNavigation.navigate('PayoutSetup', {
    workflowToken,
    workflowKind: action.kind,
  });
  return true;
};


// Save Report Function
  const saveReport = async () => {
    if (!draftCoord && !isEditing) return;

    try {
      const userId = permanentUserId(currentUser);
      setSaveStage(isEditing ? 'Saving report changes…' : 'Saving report details…');

      if (!userId) {
        setDraftCoord(null);
        setFormOpen(false);
        setIsEditing(false);
        setEditingReportId(null);
        showPermanentAccountRequired();
        return;
      }

      const createPayload = {
        title: normalizeReportTitle(form.title),
        litter_types: form.selectedTypes?.length ? form.selectedTypes : null,
        types: form.types?.trim() || null,
        notes_presets: form.selectedNotes?.length ? form.selectedNotes : null,
        notes_other: form.notes?.trim() || null,
        severity: form.severity || null,
        latitude: draftCoord.latitude,
        longitude: draftCoord.longitude,
        user_id: userId,
      };

      const updatePayload = {
        title: normalizeReportTitle(form.title),
        litter_types: form.selectedTypes?.length ? form.selectedTypes : null,
        types: form.types?.trim() || null,
        notes_presets: form.selectedNotes?.length ? form.selectedNotes : null,
        notes_other: form.notes?.trim() || null,
        severity: form.severity || null,
      };

      let data, error;

      if (isEditing && editingReportId) {
        let replacementPhotoPaths = [];
        if (form.photos?.length > 0) {
          replacementPhotoPaths = await uploadReportPhotos(
            form.photos,
            editingReportId,
            userId,
            setSaveStage,
          );
        }
        const previousPhotoPaths = selectedReport?.photo_paths ?? [];
        ({ data, error } = await supabase
          .from('reports')
          .update({
            ...updatePayload,
            ...(replacementPhotoPaths.length > 0
              ? { photo_paths: replacementPhotoPaths }
              : {}),
          })
          .eq('id', editingReportId)
          .eq('user_id', userId)
          .select()
          .single());
        if (error && replacementPhotoPaths.length > 0) {
          await supabase.storage.from('report_photos').remove(replacementPhotoPaths);
        }
        if (!error && replacementPhotoPaths.length > 0) {
          const obsoletePaths = previousPhotoPaths.filter(
            (path) => !replacementPhotoPaths.includes(path)
          );
          if (obsoletePaths.length > 0) {
            const { error: cleanupError } = await supabase.storage
              .from('report_photos')
              .remove(obsoletePaths);
            if (cleanupError) console.log('Old report photo cleanup failed:', cleanupError);
          }
          if (geminiReviewEnabled) {
            refreshReportAfterFundingReview(
              editingReportId,
              'Updated report funding photo review deferred:',
            );
          }
        }
      } else {
        data = await publishReportDraft({ userId, payload: createPayload, form, coordinate: draftCoord, upload: uploadReportPhotos, onProgress: setSaveStage });
      }

      if (error) {
        if (
          isEditing
          && (
            error.code === 'PGRST116'
            || /0 rows|no rows|cannot coerce/i.test(error.message ?? '')
          )
        ) {
          const latestReport = await reconcileReportAfterBlockedMutation(editingReportId);
          setFormOpen(false);
          setIsEditing(false);
          setEditingReportId(null);
          setDraftCoord(null);

          if (latestReport) {
            setSelectedReport(latestReport);
            setDetailsOpen(true);
            Alert.alert(
              'Report locked',
              'Cleanup activity has started, so this report can no longer be edited.'
            );
          } else {
            Alert.alert('Report unavailable', 'This report is no longer available.');
          }
          return;
        }

        if (!isEditing) trackParticipationFailure('report', 'review', 'publication_unconfirmed');
        Alert.alert('Couldn’t save report', userMessage(error, 'Your report hasn’t been saved. Please try again.'));
        return;
      }

      if (!isEditing) {
        trackParticipation('report', 'published');
        hapticSuccess();
        showFlowDone({ bug: 'dragonfly', title: 'Report posted', text: 'Thanks for helping keep the community clean!' });
        setPostedPinId(data.id);
        setTimeout(() => setPostedPinId(null), 4000);
        if (geminiReviewEnabled) refreshReportAfterFundingReview(data.id, 'Report photo review deferred:');
        await clearReportDraft(currentUserId).catch(error => console.log('Published draft cleanup deferred:', error));
        await clearReportSubmission(currentUserId).catch(error => console.log('Published submission cleanup deferred:', error));
      }
      upsertReport({ ...data, reporter: data.reporter || currentProfile });
      if (isEditing) await refreshReports({ showRefresh: false });
      else refreshProfile().catch((profileError) => {
        console.log('Profile refresh deferred after report save:', profileError);
      });

      setDraftCoord(null);
      setFormOpen(false);
        setIsEditing(false);
      setEditingReportId(null);
      resetReportWizard();

      if (!isEditing && startingContributionCents) {
        const initialAmount = (startingContributionCents / 100).toFixed(2);
        await savePendingReportFunding(data.id, initialAmount).catch((error) => {
          console.log('Pending report funding save error:', error);
        });
        navigation.getParent()?.navigate('FundingContribution', {
          reportId: data.id,
          initialAmount,
          fromReportCreation: true,
        });
      } else if (isEditing) {
        // A new report already showed its finish banner above; an edit gets its own.
        showFlowDone({ bug: 'dragonfly', title: 'Report updated', text: 'Your changes are saved.' });
      }
    } catch (e) {
      console.error('Unexpected save error:', e);
      Alert.alert(
        'Couldn’t finish saving report',
        isEditing ? userMessage(e, 'Your changes haven’t been saved. Please try again.') : `${userMessage(e, 'The upload was interrupted.')} Your answers remain here. Try submitting again to continue.`
      );
    }
  };

// Final submit from Review screen
const submitReport = async () => {
  if (isSaving || submissionLock.current) return;

  if (!hasAttachedReportPhoto()) {
    Alert.alert(
      'Photo required',
      'Add at least one clear photo so volunteers can identify the cleanup site.'
    );
    jumpToReportStep(0);
    return;
  }

  if (!canAdvanceFromStep(1)) {
    Alert.alert('Litter type required', 'Choose at least one litter type.');
    jumpToReportStep(1);
    return;
  }

  if (!canAdvanceFromStep(2)) {
    Alert.alert('Severity required', 'Choose a severity level.');
    jumpToReportStep(2);
    return;
  }

  if (!hasStartingFundingChoice) {
    Alert.alert(
      'Choose cleanup funding',
      'Select No contribution now or choose an amount to add.'
    );
    return;
  }

  if (wantsStartingFunding && !startingContributionCents) {
    Alert.alert(
      'Enter a valid contribution',
      'Choose at least $1 and no more than $1,000, or select No contribution now.'
    );
    return;
  }

  submissionLock.current = true;
  setIsSaving(true);
  setSaveStage('Saving report details…');

  try {
    await saveReport();
  } finally {
    submissionLock.current = false;
    setIsSaving(false);
    setSaveStage('Saving report…');
  }
};

  // Cancel Report
  const discardDraft = () => {
    if (!isEditing && currentUserId) clearReportDraft(currentUserId).catch(() => setDraftSaveError(true));
    setDraftCoord(null);
    setFormOpen(false);
    setIsEditing(false);
    setEditingReportId(null);
    resetReportWizard();
  };

  const cancelDraft = () => {
    const hasDraftContent = isEditing
      || reportStep > 0
      || Boolean(form.title?.trim())
      || Boolean(form.types?.trim())
      || Boolean(form.notes?.trim())
      || form.selectedTypes.length > 0
      || form.selectedNotes.length > 0
      || form.photos.length > 0
      || Boolean(form.severity)
      || Boolean(form.startingFundingChoice && form.startingFundingChoice !== 'none')
      || Boolean(form.startingFundingOther?.trim());

    if (!hasDraftContent) {
      discardDraft();
      return;
    }

    Alert.alert(
      isEditing ? 'Discard report changes?' : 'Keep your report?',
      isEditing
        ? 'Your unsaved changes will be lost.'
        : 'Save your details and photos to finish later, or discard this draft.',
      [
        { text: 'Keep editing', style: 'cancel' },
        ...(!isEditing ? [{ text: 'Save for later', onPress: async () => {
          try { await saveReportDraft(currentUserId, { form, coordinate: draftCoord, step: reportStep }); setFormOpen(false); setDraftCoord(null); }
          catch { Alert.alert('Draft not saved', 'Keep this screen open and try again.'); }
        } }] : []),
        { text: 'Discard', style: 'destructive', onPress: discardDraft },
      ],
    );
  };

// User Can Center Back to their Location on Map
  const centerOnUser = async () => {
    if (isCentering) return;
    setIsCentering(true);
    try {
      await locateAndCenterMap();
    } catch (e) {
      console.log('Center error:', e);
      setMapUserLocation(null);
      Alert.alert(
        Device.isDevice ? 'Location unavailable' : 'Simulator location unavailable',
        Device.isDevice
          ? (e?.message || 'Unable to find your location. Please try again.')
          : 'The iOS simulator uses a simulated location, not your physical location. Choose Features → Location in Simulator to set a test location, or use Litterbugs on an iPhone to check your actual location.',
      );
    } finally {
      setIsCentering(false);
    }
  };

// Can Change Map Type - Sattelite, Ect
  const toggleMapType = () => {
    setMapType((prev) => {
      if (prev === 'standard') return 'satellite';
      if (prev === 'satellite') return 'hybrid';
      if (prev === 'hybrid') return Platform.OS === 'android' ? 'terrain' : 'standard';
      if (prev === 'terrain') return 'standard';
      return 'standard';
    });
  };




  // Photo upload function
  const pickImage = async (source = 'library') => {
    if (isSaving || photoPreparationStatus) return;
    setPhotoPreparationStatus(
      source === 'camera' ? 'Opening camera…' : 'Opening photo library…',
    );

    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert(
            'Camera permission required',
            'Allow camera access to take litter report photos.',
          );
          return;
        }
      }

      // PHPicker grants access only to the photos the user selects, so requesting
      // full-library permission first is unnecessary and can open a separate
      // limited-access sheet instead of the report photo picker on iOS.
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(reportCameraPickerOptions({
          nativePhotoOptimizationAvailable: isPhotoOptimizationAvailable(),
        }))
        : await ImagePicker.launchImageLibraryAsync(
          reportPhotoPickerOptions(form.photos.length, {
            nativePhotoOptimizationAvailable: isPhotoOptimizationAvailable(),
          }),
        );

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoPreparationStatus(
          `Preparing ${result.assets.length} selected ${result.assets.length === 1 ? 'photo' : 'photos'}…`,
        );
        const preparedAssets = [];
        for (let index = 0; index < result.assets.length; index += 1) {
          setPhotoPreparationStatus(
            `Preparing photo ${index + 1} of ${result.assets.length}…`,
          );
          const prepared = await preparePhotoForSafetyScan(result.assets[index].uri, { width: result.assets[index].width, height: result.assets[index].height });
          preparedAssets.push({ uri: prepared.uri });
        }
        setForm((prev) => ({
          ...prev,
          photos: mergeReportPhotoUris(prev.photos, preparedAssets),
        }));
      }
    } catch (e) {
      console.log('Image picker error:', e);
      Alert.alert('Couldn’t add photos', e?.message || 'Unable to open the photo library right now.');
    } finally {
      setPhotoPreparationStatus(null);
    }
  };

    // Delete Photos
    const removePhoto = (index) => {
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index),
      }));
    };

const refreshReportMarkerSnapshots = useCallback(() => {
  if (markers.length === 0) return;

  setTracksReportMarkers(true);
  if (reportMarkerTrackingTimerRef.current) {
    clearTimeout(reportMarkerTrackingTimerRef.current);
  }
  reportMarkerTrackingTimerRef.current = setTimeout(() => {
    setTracksReportMarkers(false);
    reportMarkerTrackingTimerRef.current = null;
  }, 1000);
}, [markers.length]);

useEffect(() => {
  refreshReportMarkerSnapshots();
}, [refreshReportMarkerSnapshots]);

useEffect(() => () => {
  if (reportMarkerTrackingTimerRef.current) {
    clearTimeout(reportMarkerTrackingTimerRef.current);
  }
}, []);

const getClusterStatusCounts = (clusterId) => {
  const leaves = reportClusterRef.current?.getLeaves(clusterId, Infinity) || [];
  return clusterStatusCounts(leaves);
};

const openReportDetails = (report) => {
  if (!report) return;
  setReportOpenRevision(value => value + 1);
  setPreviewId(null);
  setNearbyIds([]);
  const firstPhotoPath = report.photo_paths?.[0];
  const openingCompletedReport = report.cleanup_state === 'completed';
  if (firstPhotoPath) {
    getReportPhotoUrl(firstPhotoPath).catch((error) => {
      console.log('Report photo prefetch error:', error);
    });
  }
  setReportPhotoUrls([]);
  setPhotosLoading(Boolean(firstPhotoPath));
  setSelectedCleanupAttempt(null);
  setCleanupAttemptLoading(Boolean(currentUserId && isCleanupInProgress(report)));
  setCompletedCleanupImpact(null);
  setCompletedCleanupImpactError(null);
  setCompletedCleanupImpactLoading(openingCompletedReport);
  setSelectedReport(report);
  setPreviewId(report.id);
  setDetailsOpen(true);
};

const editReportPhotos = (report) => {
  if (!canEditOrDeleteReport(report, currentUser) || report.funding_locked_at) return false;
  reopenReportOnFocus.current = false;
  setSelectedReport(report);
  setForm({
    title: report.title || '', selectedTypes: report.litter_types || [],
    types: report.types || '', photos: [], severity: report.severity || '',
    selectedNotes: report.notes_presets || [], notes: report.notes_other || '',
    startingFundingChoice: 'none', startingFundingOther: '',
  });
  setEditingReportId(report.id);
  setIsEditing(true);
  setDraftCoord({ latitude: report.latitude, longitude: report.longitude });
  resetReportWizard();
  setDetailsOpen(false);
  setFormOpen(true);
  return true;
};

const closeReportDetails = () => {
  setDetailsOpen(false);
  setSelectedReport(null);
  setPreviewId(null);
  if (route?.params?.returnTo === 'Reports') {
    navigation.setParams({ reportId: undefined, returnTo: undefined });
    navigation.navigate('Reports');
  }
};

useEffect(() => {
  if (selectedReport?.user_id && blockedIds.includes(selectedReport.user_id)) {
    setDetailsOpen(false);
    setSelectedReport(null);
  }
}, [blockedIds, selectedReport?.user_id]);

// Opened from the daily nearby alert: show the whole alert area around where the person is.
useEffect(() => {
  if (!route?.params?.showNearby) return;
  navigation.setParams({ showNearby: undefined });
  setPreviewId(null);
  locateAndCenterMap({
    showPermissionAlert: false,
    requestPermission: false,
    regionForPosition: (position) => nearbyAlertRegion(position.coords),
  }).catch(() => {});
}, [route?.params?.showNearby]);

useEffect(() => {
  const requestedReportId = route?.params?.reportId;
  if (!requestedReportId) return undefined;

  let active = true;

  const openRequestedReport = async () => {
    const requestedMarker = markers.find(
      ({ id }) => String(id) === String(requestedReportId)
    );

    try {
      // Recheck ownership and locks before an edit requested from another page.
      const report = route?.params?.editPhotos
        ? await getReportById(requestedReportId)
        : requestedMarker?.report ?? await getReportById(requestedReportId);

      if (!active) return;

      if (!report) {
        Alert.alert('Report unavailable', 'This cleanup report could not be opened.');
        navigation.setParams({ reportId: undefined });
        return;
      }

      const latitude = Number(report.latitude);
      const longitude = Number(report.longitude);
      if (route?.params?.returnTo !== 'Reports' && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        commitMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      }

      if (!route?.params?.editPhotos || !editReportPhotos(report)) openReportDetails(report);
      navigation.setParams({ reportId: undefined, editPhotos: undefined });
    } catch (error) {
      console.log('Requested report load error:', error);
      if (active) {
        Alert.alert('Report unavailable', 'Check your connection and try again.');
      }
    }
  };

  openRequestedReport();

  return () => {
    active = false;
  };
}, [
  commitMapRegion,
  getReportById,
  markers,
  navigation,
  route?.params?.reportId,
  route?.params?.editPhotos,
]);

  useSelectedReportLoaders({
    selectedReport,
    currentUserId,
    reportOpenRevision,
    completedCleanupImpactReloadKey,
    getReportPhotoUrl,
    setPhotosLoading,
    setReportPhotoUrls,
    setSelectedCleanupAttempt,
    setCleanupAttemptLoading,
    setCompletedCleanupImpact,
    setCompletedCleanupImpactError,
    setCompletedCleanupImpactLoading,
  });

  const userOwnsSelectedReport = canManageReport(selectedReport, currentUser);
  const canEditOrDeleteSelectedReport = canEditOrDeleteReport(
    selectedReport,
    currentUser
  );
  const cleanupEligible = canOfferCleanup(selectedReport, currentUser);
  const cleanupDiscoverable = isCleanupAvailable(selectedReport);
  const currentUserIsCleaner = isCurrentCleaner(
    selectedCleanupAttempt,
    currentUser
  );
  const currentUserIsReporter = Boolean(
    currentUserId
    && selectedCleanupAttempt?.reporter_id === currentUserId
  );
  const selectedReportIsShareable = isReportShareable(selectedReport);
  const selectedReportCanOpenFunding = fundingEnabled
    && isCleanupAvailable(selectedReport)
    && selectedReport?.cleanup_state === 'available'
    && selectedReport?.renewal_status === 'active';
  const selectedReportHasUtilityActions = selectedReportCanOpenFunding
    || selectedReportIsShareable;
  const reportDetailsPreparing = photosLoading
    || cleanupAttemptLoading
    || (
      selectedReport?.cleanup_state === 'completed'
      && completedCleanupImpactLoading
    );

  useEffect(() => {
    if (!detailsOpen || !selectedReport?.id) return;
    const latestReport = markers.find(({ id }) => id === selectedReport.id)?.report;
    if (!latestReport) return;

    setSelectedReport((current) => {
      if (!current || current.id !== latestReport.id) return current;
      if (
        current.funded_amount_cents === latestReport.funded_amount_cents
        && current.funding_locked_at === latestReport.funding_locked_at
        && current.funding_eligibility === latestReport.funding_eligibility
        && current.funding_hold_reason === latestReport.funding_hold_reason
        && current.original_photo_reviewed_at === latestReport.original_photo_reviewed_at
      ) {
        return current;
      }
      return {
        ...current,
        funded_amount_cents: latestReport.funded_amount_cents,
        funding_locked_at: latestReport.funding_locked_at,
        funding_eligibility: latestReport.funding_eligibility,
        funding_hold_reason: latestReport.funding_hold_reason,
        original_photo_reviewed_at: latestReport.original_photo_reviewed_at,
      };
    });
  }, [detailsOpen, markers, selectedReport?.id]);

  const cleanupStatus = cleanupStatusPresentation(
    selectedReport,
    currentUserIsCleaner,
    currentUserIsReporter
  );

  const {
    openFundingContribution,
    beginCleanupClaim,
    acceptWaiverAndContinue,
    openCleanupNavigation,
    openCleanupSubmission,
    openCleanupReview,
    openCleanupFeedback,
    confirmCleanupRelease,
  } = useCleanupFlow({
    cleanupActionBusy,
    cleanupDiscoverable,
    cleanupEligible,
    cleanupWaiver,
    cleanupWaiverOpen,
    currentUserId,
    detailsOpen,
    getReportById,
    isMapScreenFocused,
    navigation,
    openPayoutSetupForWorkflow,
    payoutGateBusy,
    pendingPayoutWorkflowToken,
    refreshReports,
    reopenReportOnFocus,
    selectedCleanupAttempt,
    selectedReport,
    setCleanupActionBusy,
    setCleanupWaiver,
    setCleanupWaiverOpen,
    setCleanupWaiverQueued,
    setDetailsOpen,
    setPendingAction,
    setPendingPayoutWorkflowToken,
    setPendingReportCoordinate,
    setReportReopenQueued,
    setSelectedCleanupAttempt,
    setSelectedReport,
    upsertReport,
  });

// =============================
// Report Form Step Content
// =============================

const revealBottomReportField = () => {
  const keyboardAnimationDelay = Platform.OS === 'ios' ? 320 : 120;
  setTimeout(() => {
    reportWizardScrollRef.current?.scrollToEnd({ animated: true });
  }, keyboardAnimationDelay);
};







  // Map View . . .
  return (
    <View style={styles.container}>
        <ClusteredMapView
          ref={mapViewRef}
          testID="discovery-map"
          style={StyleSheet.absoluteFill}
          onMapReady={() => setMapReady(true)}
          onMapLoaded={() => {
            setMapReady(true);
            setMapSurfaceLoaded(true);
          }}
          initialRegion={region}
          region={region}
          onRegionChange={pins.regionChanging}
          onRegionChangeComplete={(nextRegion) => {
            pins.regionSettled(nextRegion);
            if (reportPlacementActive) {
              setPlacementCoordinate(mapCenterCoordinate(nextRegion));
            }
            if (!mapRegionsAreEquivalent(region, nextRegion)) {
              refreshReportMarkerSnapshots();
              setRegion(nextRegion);
            }
          }}
          maxZoom={14}
          // A tapped group zooms in enough to split it and spread its pins over the middle of the
          // screen, never so far that they reach its edges (lib/clusterZoom.js).
          preserveClusterPressBehavior
          onClusterPress={(cluster, leaves) => {
            const clusters = reportClusterRef.current;
            const clusterId = cluster?.properties?.cluster_id ?? cluster?.id;
            if (!clusters || clusterId == null || !leaves?.length) return;
            mapViewRef.current?.animateToRegion?.(regionForGroup({
              leaves,
              splitZoom: clusters.getClusterExpansionZoom(clusterId),
              closestZoom: 15, // one past maxZoom: every report is its own pin
              currentRegion: region,
              zoomOf: (next) => returnMapZoom(next, calculateBBox(next), 1),
            }), 300);
          }}
          // Match the 60-point pins and 96-point cluster status controls.
          radius={80}
          animationEnabled={false}
          // Keep native marker children in one tree; maxZoom reveals individual pins.
          clusteringEnabled={true}
          spiralEnabled={false}
          superClusterRef={reportClusterRef}
          renderCluster={({ id, geometry, properties, onPress }) => {
            const statusCounts = getClusterStatusCounts(id);
            // Like the website, a group shows the bug of its most useful member
            // (litter that still needs a cleanup first) next to the count.
            const clusterKind = statusCounts.available ? 'open' : statusCounts.active ? 'busy' : 'done';
            // A group is known by the reports inside it, so one that only moves while zooming
            // does not land again. Its look is in the key: a changed group is a new pin.
            const groupKey = `group:${(reportClusterRef.current?.getLeaves(id, Infinity) || []).map(leaf => String(leaf?.properties?.identifier || '').split(':').pop()).sort().join(',')}`;
            const groupCoordinate = { latitude: geometry.coordinates[1], longitude: geometry.coordinates[0] };
            const groupShown = pins.isShown(groupKey);
            return (
              <Marker
                key={groupShown ? `${groupKey}:${clusterKind}:${properties.point_count}:${groupCoordinate.latitude.toFixed(6)},${groupCoordinate.longitude.toFixed(6)}` : `${groupKey}:pending`}
                coordinate={{
                  latitude: geometry.coordinates[1],
                  longitude: geometry.coordinates[0],
                }}
                tracksViewChanges={Platform.OS === 'ios' ? true : tracksReportMarkers}
                anchor={{ x: 0.5, y: 1 }}
                centerOffset={groupShown ? pinCenterOffset(clusterKind, `${properties.point_count}`) : undefined}
                accessibilityLabel={`${properties.point_count} reports: ${statusCounts.available} available, ${statusCounts.active} in progress, ${statusCounts.completed} completed`}
                onPress={(event) => {
                  event?.stopPropagation?.();
                  if (reportPlacementActive) return;
                  setPreviewId(null);
                  setNearbyIds([]);
                  onPress();
                }}
              >
                {groupShown ? (
                  <MapPin kind={clusterKind} text={`${properties.point_count}`}
                    onMount={() => pins.track(groupKey, { coordinate: groupCoordinate, kind: clusterKind, text: `${properties.point_count}` })}
                    onUnmount={() => pins.untrack(groupKey)} />
                ) : (
                  <PinPlaceholder
                    onMount={() => pins.track(groupKey, { coordinate: groupCoordinate, kind: clusterKind, text: `${properties.point_count}` })}
                    onUnmount={() => pins.untrack(groupKey)} />
                )}
              </Marker>
            );
          }}
          onPress={(event) => {
            if (event.nativeEvent.action !== 'marker-press') {
              setPreviewId(null);
              setNearbyIds([]);
            }
          }}
          {...(locationPermissionGranted ? { showsUserLocation: true } : {})}
          onUserLocationChange={(event) => setMapUserLocation(event.nativeEvent.coordinate)}
          followsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          // Like the website: no business or park names competing with the report pins.
          showsPointsOfInterest={false}
          // The website's calm map: Apple's muted style on iOS, a calm Google style on Android.
          mapType={mapType === 'standard' && Platform.OS === 'ios' ? 'mutedStandard' : mapType}
          {...(mapType === 'standard' && Platform.OS === 'android' ? { customMapStyle: CALM_MAP_STYLE } : {})}
        >

        {polygonParts(searchPlace?.geometry).map(([outer, ...holes], index) => <Polygon key={`${searchPlace.id}:${index}`}
          coordinates={outer.map(([longitude, latitude]) => ({ latitude, longitude }))}
          holes={holes.map(ring => ring.map(([longitude, latitude]) => ({ latitude, longitude })))}
          strokeColor={colors.primary} accessible={false} importantForAccessibility="no" strokeWidth={1.5} fillColor="rgba(81, 70, 237, 0.035)" tappable={false} />)}
        {markers.map((marker) => {
          const tone = reportMarkerPresentation(marker.report);
          const fundingLabel = formatMapFundingLabel(marker.report?.funded_amount_cents);
          const kind = pinKind(marker.report?.cleanup_state);
          // Website pins: the bug alone, plus the amount only when there is money.
          const text = kind === 'open' && marker.report?.funded_amount_cents > 0 ? fundingLabel : null;
          const shown = pins.isShown(marker.id);
          const info = { coordinate: marker.coordinate, kind, text };
          return (
            <Marker
              // Never update a pin on the map (iPhone draws it in the wrong place): anything that
              // changes how it looks is in the key, so a change puts a new pin in its place.
              // Selecting a pin never touches it: the selected look is a second pin laid on top.
              key={shown ? `${marker.id}:${kind}:${text ?? ''}` : `${marker.id}:pending`}
              coordinate={marker.coordinate}
              identifier={`report:${tone.key}:${marker.id}`}
              tracksViewChanges={Platform.OS === 'ios' ? true : tracksReportMarkers}
              anchor={{ x: 0.5, y: 1 }}
              centerOffset={shown ? pinCenterOffset(kind, text) : undefined}
              accessibilityLabel={`${tone.accessibilityLabel}${tone.key === 'available' ? `, ${fundingLabel}` : ''}: ${marker.report?.title || 'Litter report'}`}
              onPress={(event) => {
                event?.stopPropagation?.();
                if (reportPlacementActive) return;
                chooseMapReport(marker.report);
              }}
            >
              {shown ? (
                <MapPin kind={kind} text={text}
                  onMount={() => pins.track(marker.id, info)} onUnmount={() => pins.untrack(marker.id)} />
              ) : (
                <PinPlaceholder onMount={() => pins.track(marker.id, info)} onUnmount={() => pins.untrack(marker.id)} />
              )}
            </Marker>
          );
        })}

        {/* The selected pin, laid over its pin on the map. Swapping the pin itself for a selected
            one left a frame or two with no pin at all (a blink) while the map drew the new one;
            with the plain pin left in place underneath, there is always a pin showing. */}
        {(() => {
          const marker = previewId ? markers.find(item => item.id === previewId) : null;
          if (!marker || !pins.isOnMap(marker.id)) return null;
          const kind = pinKind(marker.report?.cleanup_state);
          const text = kind === 'open' && marker.report?.funded_amount_cents > 0 ? formatMapFundingLabel(marker.report?.funded_amount_cents) : null;
          return (
            <Marker
              key={`selected:${marker.id}:${kind}:${text ?? ''}`}
              cluster={false}
              zIndex={1000}
              coordinate={marker.coordinate}
              tracksViewChanges={Platform.OS === 'ios' ? true : tracksReportMarkers}
              anchor={{ x: 0.5, y: 1 }}
              centerOffset={pinCenterOffset(kind, text)}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              onPress={(event) => { event?.stopPropagation?.(); }}
            >
              <MapPin kind={kind} text={text} selected />
            </Marker>
          );
        })()}

      </ClusteredMapView>

      {/* Pins and groups land here, above the map, then a new real pin appears underneath. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {pins.ghosts.map((pin) => (
          <PinLanding key={pin.key} x={pin.x} y={pin.y} kind={pin.kind} text={pin.text} order={pin.order} posted={pin.posted} handover={pin.handover} onDone={() => pins.ghostDone(pin.key)} />
        ))}
      </View>

      {showInitialMapLoading ? (
        <View style={styles.initialMapLoading} pointerEvents="auto">
          <BrandedLoadingState logoOnly />
        </View>
      ) : null}

      {!showInitialMapLoading ? (
        <View
          style={[styles.floatingMapHeaderArea, { top: insets.top + 10 }]}
          pointerEvents="box-none"
          accessible={false}
        >
          {!reportPlacementActive ? <ReportFilters map /> : null}
          {reportsError && !reportPlacementActive ? <TouchableOpacity
            accessibilityRole="button" onPress={() => refreshReports({ showRefresh: true })}
            style={{ backgroundColor: colors.white, borderRadius: 14, padding: 12, marginTop: 8 }}>
            <Text style={{ color: colors.ink, fontWeight: '600' }}>Reports couldn’t refresh. Tap to try again.</Text>
          </TouchableOpacity> : null}
          {searchPlace && !reportPlacementActive && !mapRegionsAreEquivalent(region, searchPlace.region) ? <TouchableOpacity onPress={() => { setPreviewId(null); commitMapRegion(searchPlace.region); }} accessibilityRole="button" accessibilityLabel="Re-center selected search area" style={{ alignSelf: 'center', backgroundColor: colors.white, borderRadius: 18, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', marginTop: 8 }}><Text style={{ color: colors.primaryDark, fontWeight: '600' }}>Re-center</Text></TouchableOpacity> : null}
          {!reportPlacementActive ? <MapKey counts={mapKeyCounts(markers, region)} /> : null}

          <Animated.View
            pointerEvents="none"
            style={[
              styles.floatingMapHeaderCard,
              styles.floatingMapInstructionCard,
              {
                opacity: reportControlTransition.interpolate({
                  inputRange: [0.54, 1],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateY: reportControlTransition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-4, 0],
                    }),
                  },
                  {
                    scale: reportControlTransition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.floatingMapInstructionTitle}>Where is the litter?</Text>
          </Animated.View>
        </View>
      ) : null}

      <MapControls
        cancelReportLocationPicker={cancelReportLocationPicker}
        centerOnUser={centerOnUser}
        clearSearchPlace={clearSearchPlace}
        confirmReportLocation={confirmReportLocation}
        detailsOpen={detailsOpen}
        fontScale={fontScale}
        formOpen={formOpen}
        isCentering={isCentering}
        isCheckingReportLocation={isCheckingReportLocation}
        isLocatingReportLocation={isLocatingReportLocation}
        isSaving={isSaving}
        mapControlsBottom={mapControlsBottom}
        mapType={mapType}
        openReportLocationPicker={openReportLocationPicker}
        previewControlsHidden={previewControlsHidden}
        reportControlTransition={reportControlTransition}
        reportControlWidth={reportControlWidth}
        reportPlacementActive={reportPlacementActive}
        showInitialMapLoading={showInitialMapLoading}
        toggleMapType={toggleMapType}
      />

{!reportPlacementActive && !detailsOpen && !showInitialMapLoading ? <MapReportPreview
        report={previewReport} nearby={nearbyReports} bottom={mapControlsBottom}
        insetBottom={insets.bottom} getPhotoUrl={getReportPhotoUrl}
        isFavorite={favoriteIds.includes(previewReport?.id)} onFavorite={toggleFavorite} favoritesReady={favoritesReady}
        distance={reportDistanceMiles(mapUserLocation, previewReport)}
        onClose={() => setPreviewId(null)} onCloseNearby={() => setNearbyIds([])}
        onChoose={chooseMapReport} onDetails={openReportDetails}
        canFund={fundingEnabled && isCleanupAvailable(previewReport) && previewReport?.renewal_status === 'active' && previewReport?.funding_eligibility === 'eligible'}
        canShare={isReportShareable(previewReport)}
        onShare={shareMapReport}
        onFund={(report) => { setSelectedReport(report); openFundingContribution({ reportId: report.id }); }}
      /> : null}

{/* Multi-step Report Form */}
<ReportWizardModal
  beginReportAtCoordinate={beginReportAtCoordinate}
  canAdvanceFromStep={canAdvanceFromStep}
  cancelDraft={cancelDraft}
  changeDraftLocation={changeDraftLocation}
  currentUserId={currentUserId}
  draftCoord={draftCoord}
  draftSaveError={draftSaveError}
  form={form}
  formOpen={formOpen}
  fundingEnabled={fundingEnabled}
  goToNextReportStep={goToNextReportStep}
  goToPreviousReportStep={goToPreviousReportStep}
  hasAttachedReportPhoto={hasAttachedReportPhoto}
  hasStartingFundingChoice={hasStartingFundingChoice}
  isEditing={isEditing}
  isPreparingPhotos={isPreparingPhotos}
  isSaving={isSaving}
  isTransitioning={isTransitioning}
  jumpToReportStep={jumpToReportStep}
  photoPreparationStatus={photoPreparationStatus}
  pickImage={pickImage}
  removePhoto={removePhoto}
  reportKeyboardHeight={reportKeyboardHeight}
  reportKeyboardVisible={reportKeyboardVisible}
  reportPhotoUrls={reportPhotoUrls}
  reportStep={reportStep}
  reportStepPanResponder={reportStepPanResponder}
  reportWizardScrollRef={reportWizardScrollRef}
  returnToReview={returnToReview}
  revealBottomReportField={revealBottomReportField}
  saveStage={saveStage}
  selectedReport={selectedReport}
  setForm={setForm}
  showPhotoPreparation={showPhotoPreparation}
  startingContributionCents={startingContributionCents}
  stepOpacity={stepOpacity}
  stepTranslateX={stepTranslateX}
  submitReport={submitReport}
  wantsStartingFunding={wantsStartingFunding}
/>

{/* ============================= */}
{/* Redesigned Report Detail View */}
{/* ============================= */}

<ReportDetailsSheet state={{ detailsOpen, reportShareSheetOpen, reportShareBusyAction, selectedReport, insets, region, reportDetailsPreparing, selectedReportHasUtilityActions, completedCleanupImpact, completedCleanupImpactLoading, completedCleanupImpactError, reportHeroWidth, currentUserId, reportPhotoUrls, photosLoading, geminiReviewEnabled, userOwnsSelectedReport, reportFundingFeedback, cleanupDiscoverable, cleanupStatus, currentUserIsCleaner, selectedCleanupAttempt, cleanupAttemptLoading, cleanupActionBusy, canEditOrDeleteSelectedReport, selectedReportCanOpenFunding, payoutGateBusy, selectedReportIsShareable, isFavorite: favoriteIds.includes(selectedReport?.id), favoritesReady, isHidden: hiddenIds.includes(selectedReport?.id) }}
  actions={{ setReportShareSheetOpen, closeReportDetails, setDetailsOpen, setSelectedReport, setPreviewId, navigation, commitMapRegion, setCompletedCleanupImpact, setCompletedCleanupImpactError, setCompletedCleanupImpactLoading, setCompletedCleanupImpactReloadKey, openCleanupNavigation, openCleanupSubmission, confirmCleanupRelease, openCleanupFeedback, openCleanupReview, beginCleanupClaim, openFundingContribution, removeReport, setForm, setEditingReportId, setIsEditing, setDraftCoord, resetReportWizard, setFormOpen, shareSelectedReport, shareSelectedReportLink, shareSelectedReportToInstagram, editReportPhotos, toggleFavorite, toggleHidden }} />

<CleanupWaiverModal
  visible={cleanupWaiverOpen}
  waiver={cleanupWaiver}
  report={selectedReport}
  accepting={cleanupActionBusy}
  onAccept={acceptWaiverAndContinue}
  onClose={() => {
    if (cleanupActionBusy) return;
    setCleanupWaiverOpen(false);
    setReportReopenQueued(true);
  }}
/>

    </View>
  );
}
