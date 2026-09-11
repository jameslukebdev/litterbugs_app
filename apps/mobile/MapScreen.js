import { userMessage } from './lib/userMessage';
import { publishReportDraft, clearReportSubmission } from './lib/reportSubmissionStore';
import ReportDetailsSheet from './components/ReportDetailsSheet';
import { canAdvanceReportStep, nextReportStep } from './lib/reportWizard';
import styles from './styles/MapScreen.styles';
import ReportWizardSteps from './components/ReportWizardSteps';

import MapReportPreview from './components/MapReportPreview';
import useMapLabels from './lib/useMapLabels';
import { resolveReportPhotoUrls } from './lib/reportPhotoUrls';
import ReportMapMarkers from './components/ReportMapMarkers';

import { saveReportDraft, loadReportDraft, clearReportDraft } from './lib/savedReportDraft';
import ReportFilters from './components/ReportFilters';
// MapScreen.js
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, Alert, Keyboard, Animated, Easing, PanResponder, ScrollView, TouchableWithoutFeedback, ActivityIndicator, AppState, Linking, Share as NativeShare, TurboModuleRegistry, useWindowDimensions } from 'react-native';
import { polygonParts } from './lib/searchGeography';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';

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

import {
  acceptCleanupWaiver,
  acknowledgeCleanupNotifications,
  claimCleanup,
  loadActiveCleanupAttempt,
  loadCurrentCleanupWaiver,
  loadUnreadCleanupNotifications,
  releaseCleanup,
} from './lib/cleanup';
import { canOfferCleanup, cleanupActionMessage, cleanupStatusPresentation, isCleanupInProgress, isCurrentCleaner } from './lib/cleanupEligibility';
import {
  cleanupNotificationDestination,
  cleanupNotificationPresentation,
  cleanupStateFromNotification,
} from './lib/cleanupNotifications';
import { useProfile } from './lib/profile';
import {
  CLEANUP_NAVIGATION_SAFETY_REMINDER,
  cleanupNavigationUrls,
} from './lib/cleanupNavigation';
import { loadCompletedCleanupImpact } from './lib/cleanupImpact';
import { loadCleanupFeatureFlags, loadPayoutStatus, loadReportFundingFeedback, requestGeminiReview } from './lib/funding';
import { parseContributionAmount } from './lib/fundingMath';
import { savePendingReportFunding } from './lib/pendingReportFunding';
import {
  PAYOUT_WORKFLOW_KIND,
  cleanupClaimRequiresPayoutSetup,
  consumePayoutWorkflow,
  createPayoutWorkflow,
  isPayoutConnectionReady,
} from './lib/payoutWorkflowGate';
import { hasRequiredReportPhoto } from './lib/reportDraft';
import { mergeReportPhotoUris, reportCameraPickerOptions, reportPhotoPickerOptions } from './lib/reportPhotoSelection';
import { uploadSecureMedia } from './lib/secureMediaUpload';
import {
  isPhotoOptimizationAvailable,
  preparePhotoForSafetyScan,
  validatePreparedPhotoForSafetyScan,
} from './lib/photoSafetyPreparation';
import {
  mapInConcurrentBatches,
  REPORT_PHOTO_UPLOAD_CONCURRENCY,
} from './lib/concurrentBatch';
import {
  findResponsiveUserLocation,
  mapRegionsAreEquivalent,
  userLocationRegion,
} from './lib/responsiveLocation';
import { mapCenterCoordinate } from './lib/reportLocationPlacement';


import { createReportShareModel, isInstagramStoriesAvailable, isReportShareable, prepareNativeReportShareImage, shareReportToInstagramStories, shareReportWithSystemSheet } from './lib/reportSharing';
import * as FileSystem from 'expo-file-system/legacy';

function loadInstalledRNShare() {
  if (!TurboModuleRegistry.get('RNShare')) return null;

  try {
    return require('react-native-share').default;
  } catch (error) {
    console.log('Native report sharing unavailable:', error);
    return null;
  }
}

const installedRNShare = loadInstalledRNShare();

const showPermanentAccountRequired = () => {
  Alert.alert(
    'Account required',
    'Sign in with email, Google, or Facebook to create and manage reports.'
  );
};

const showLocationSettingsAlert = (message) => {
  Alert.alert(
    'Location Access Needed',
    `${message} You can turn location access on in Settings.`,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings().catch((error) => {
          console.log('Open location settings error:', error);
        }),
      },
    ]
  );
};


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
  const REPORT_STEPS = ['Photos', 'Type of litter', 'Severity', 'Site conditions', 'Review'];
  const [tracksReportMarkers, setTracksReportMarkers] = useState(true);
  const reportMarkerTrackingTimerRef = useRef(null);

  const [draftCoord, setDraftCoord] = useState(null);
  const [reportPlacementActive, setReportPlacementActive] = useState(false);
  const editingDraftLocationRef = useRef(false);
  const [placementCoordinate, setPlacementCoordinate] = useState(null);
  const reportControlTransition = useRef(new Animated.Value(0)).current;
  const [formOpen, setFormOpen] = useState(false);
  const [reportKeyboardVisible, setReportKeyboardVisible] = useState(false);
  const [reportKeyboardHeight, setReportKeyboardHeight] = useState(0);
  const [reportStep, setReportStep] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const reportWizardScrollRef = useRef(null);
  const stepTranslateX = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;
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
  const [previewHeight, setPreviewHeight] = useState(180);
  const [projectionRevision, setProjectionRevision] = useState(0);
  const [mapSize, setMapSize] = useState({ width: 400, height: 800 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportPhotoUrls, setReportPhotoUrls] = useState([]);
  const [editingReportId, setEditingReportId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const submissionLock = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStage, setSaveStage] = useState('Saving report…');
  const [photoPreparationStatus, setPhotoPreparationStatus] = useState(null);
  const [showPhotoPreparation, setShowPhotoPreparation] = useState(false);
  const isPreparingPhotos = Boolean(photoPreparationStatus?.startsWith('Preparing'));
  useEffect(() => {
    setShowPhotoPreparation(false);
    if (!isPreparingPhotos) return undefined;
    const timer = setTimeout(() => setShowPhotoPreparation(true), 400);
    return () => clearTimeout(timer);
  }, [isPreparingPhotos]);
  const [isCentering, setIsCentering] = useState(false);
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
  const [claimConfirmationQueued, setClaimConfirmationQueued] = useState(false);
  const [cleanupActionBusy, setCleanupActionBusy] = useState(false);
  const [selectedCleanupAttempt, setSelectedCleanupAttempt] = useState(null);
  const [cleanupAttemptLoading, setCleanupAttemptLoading] = useState(false);
  const [completedCleanupImpact, setCompletedCleanupImpact] = useState(null);
  const [completedCleanupImpactLoading, setCompletedCleanupImpactLoading] = useState(false);
  const [completedCleanupImpactError, setCompletedCleanupImpactError] = useState(null);
  const [completedCleanupImpactReloadKey, setCompletedCleanupImpactReloadKey] = useState(0);
  const [reportShareSheetOpen, setReportShareSheetOpen] = useState(false);
  const [reportShareBusyAction, setReportShareBusyAction] = useState(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [geminiReviewEnabled, setGeminiReviewEnabled] = useState(false);
  const [reportFundingFeedback, setReportFundingFeedback] = useState(null);
  const [pendingPayoutWorkflowToken, setPendingPayoutWorkflowToken] = useState(null);
  const [payoutGateBusy, setPayoutGateBusy] = useState(false);
  const cleanupNoticeCheckInFlight = useRef(false);
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
    favoriteIds, toggleFavorite, favoritesReady,
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
  const currentUserId = permanentUserId(currentUser);
  const [draftSaveError, setDraftSaveError] = useState(false);
  useEffect(() => {
    if (!formOpen || isEditing || !currentUserId || !draftCoord || isSaving) return undefined;
    const timer = setTimeout(() => {
      saveReportDraft(currentUserId, { form, coordinate: draftCoord, step: reportStep })
        .then(() => setDraftSaveError(false)).catch(() => setDraftSaveError(true));
    }, 350);
    return () => clearTimeout(timer);
  }, [form, formOpen, isEditing, currentUserId, draftCoord, reportStep, isSaving]);

  const fundingEnabled = paymentsEnabled && geminiReviewEnabled;

  const insets = useSafeAreaInsets();
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const mapLabels = useMapLabels({ markers, mapRef: mapViewRef, ready: mapReady, region, revision: projectionRevision, size: mapSize, selectedId: previewId, fontScale });
  const previewReport = markers.find((marker) => marker.id === previewId)?.report;
  const nearbyReports = nearbyIds.map((id) => markers.find((marker) => marker.id === id)?.report).filter(Boolean);
  const chooseMapReport = (report) => {
    setNearbyIds([]);
    setPreviewId(report.id);
    const marker = markers.find((item) => item.id === report.id);
    if (marker) mapViewRef.current?.animateToRegion({ ...region, ...marker.coordinate }, 240);
  };
  const bottomNavClearance = getBottomNavClearance(insets.bottom);

  const locateAndCenterMap = useCallback(async ({
    showPermissionAlert = true,
    requestPermission = true,
    permissionMessage = 'Allow location access to center the map on your position.',
    regionForPosition = userLocationRegion,
    accuracy = Location.Accuracy.Balanced,
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
        mapViewRef.current?.animateToRegion?.(nextRegion, 240);
        commitMapRegion(nextRegion);
      },
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

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(
      showEvent,
      event => {
        setReportKeyboardVisible(true);
        // The transparent report modal stays full height on Android too.
        setReportKeyboardHeight(event.endCoordinates.height);
      }
    );
    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => { setReportKeyboardVisible(false); setReportKeyboardHeight(0); }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!formOpen) setReportKeyboardVisible(false);
  }, [formOpen]);

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

  useEffect(() => {
    let active = true;
    loadCleanupFeatureFlags()
      .then((flags) => {
        if (!active) return;
        setPaymentsEnabled(Boolean(flags.payments_enabled));
        setGeminiReviewEnabled(Boolean(flags.gemini_financial_review_enabled));
      })
      .catch(() => {
        if (!active) return;
        setPaymentsEnabled(false);
        setGeminiReviewEnabled(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const shouldLoad = geminiReviewEnabled
      && currentUserId
      && selectedReport?.user_id === currentUserId
      && ['better_photos', 'safety_hold', 'ineligible'].includes(
        selectedReport?.funding_eligibility
      );
    if (!shouldLoad) {
      setReportFundingFeedback(null);
      return undefined;
    }
    loadReportFundingFeedback(selectedReport.id)
      .then((feedback) => {
        if (active) setReportFundingFeedback(feedback);
      })
      .catch((error) => {
        console.log('Report funding feedback load error:', error);
        if (active) setReportFundingFeedback(null);
      });
    return () => {
      active = false;
    };
  }, [
    currentUserId,
    geminiReviewEnabled,
    selectedReport?.funding_eligibility,
    selectedReport?.id,
    selectedReport?.user_id,
  ]);
  const mapControlsBottom = bottomNavClearance + BOTTOM_NAV_METRICS.mapControlGap;
  // Leave 20px margin on each side of the main report photo
  const reportHeroWidth = Math.max(screenWidth - 40, 280);

  useEffect(() => {
    if (!currentUserId) return undefined;

    let active = true;

    const checkCleanupNotices = async () => {
      if (cleanupNoticeCheckInFlight.current) return;

      try {
        cleanupNoticeCheckInFlight.current = true;
        const notices = await loadUnreadCleanupNotifications();
        if (!active || notices.length === 0) return;

        const reportStates = new Map();
        const attemptStates = new Map();
        notices.forEach((notice) => {
          const state = cleanupStateFromNotification(notice);
          if (!state) return;
          reportStates.set(notice.report_id, state);
          attemptStates.set(notice.cleanup_attempt_id, state);
        });

        setSelectedReport((report) => {
          const state = reportStates.get(report?.id);
          return state ? { ...report, cleanup_state: state } : report;
        });
        setSelectedCleanupAttempt((attempt) => {
          const state = attemptStates.get(attempt?.id);
          if (state === 'available') return null;
          return state ? { ...attempt, status: state } : attempt;
        });

        const paymentReadyNotice = notices.find(({ event_type: eventType }) => (
          eventType === 'report_funding_approved'
        ));
        if (paymentReadyNotice) {
          const destination = cleanupNotificationDestination(paymentReadyNotice);
          await acknowledgeCleanupNotifications([paymentReadyNotice.id]);
          await refreshReports({ showRefresh: false });
          if (destination) {
            navigation.getParent()?.navigate(destination.name, destination.params);
          }
          return;
        }

        const presentation = cleanupNotificationPresentation(notices);
        const destination = notices.length === 1
          ? cleanupNotificationDestination(notices[0])
          : null;
        Alert.alert(
          presentation.title,
          presentation.message,
          destination
            ? [
              { text: 'Later', style: 'cancel' },
              {
                text: destination.label,
                onPress: () => navigation.getParent()?.navigate(
                  destination.name,
                  destination.params
                ),
              },
            ]
            : [{ text: 'OK' }]
        );

        await acknowledgeCleanupNotifications(
          notices.map(({ id }) => id)
        );
        await refreshReports({ showRefresh: false });
      } catch (error) {
        console.log('Cleanup notification error:', error);
      } finally {
        cleanupNoticeCheckInFlight.current = false;
      }
    };

    checkCleanupNotices();
    const interval = setInterval(checkCleanupNotices, 60 * 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkCleanupNotices();
    });

    return () => {
      active = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [currentUserId, refreshReports]);

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


  // const PATREON_URL = "https://patreon.com/litterbugs?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"; // <-- paste your real link

  // =============================
// Multi-step Report Form
// =============================

const resetReportWizard = () => {
  setReturnToReview(false);
  setReportStep(0);
  stepTranslateX.setValue(0);
  stepOpacity.setValue(1);
  setIsTransitioning(false);
};

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

// Determines whether the user can move forward from a given step
const canAdvanceFromStep = (step = reportStep) => canAdvanceReportStep(step, { form, isEditing, existingPhotoPaths: selectedReport?.photo_paths });

// Animate between report screens
const transitionToReportStep = (nextStep, direction) => {
  if (
    isTransitioning ||
    nextStep < 0 ||
    nextStep >= REPORT_STEPS.length ||
    nextStep === reportStep
  ) {
    return;
  }

  Keyboard.dismiss();
  setIsTransitioning(true);

  // Slide current screen out
  Animated.parallel([
    Animated.timing(stepTranslateX, {
      toValue: direction > 0 ? -80 : 80,
      duration: 150,
      useNativeDriver: true,
    }),
    Animated.timing(stepOpacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }),
  ]).start(() => {
    setReportStep(nextStep);

    // Position incoming screen on opposite side
    stepTranslateX.setValue(direction > 0 ? 80 : -80);

    // Slide new screen in
    Animated.parallel([
      Animated.timing(stepTranslateX, {
        toValue: 0,
        duration: 190,
        useNativeDriver: true,
      }),
      Animated.timing(stepOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsTransitioning(false);
    });
  });
};

const goToNextReportStep = () => {
  if (photoPreparationStatus || isTransitioning) return;
  if (reportStep >= REPORT_STEPS.length - 1) return;

  if (!canAdvanceFromStep(reportStep)) return;

  const nextStep = nextReportStep(reportStep, {
    form, isEditing, existingPhotoPaths: selectedReport?.photo_paths,
  }, returnToReview);
  if (nextStep === REPORT_STEPS.length - 1) setReturnToReview(false);
  transitionToReportStep(nextStep, nextStep > reportStep ? 1 : -1);
};

const goToPreviousReportStep = () => {
  if (isTransitioning || photoPreparationStatus) return;
  setReturnToReview(false);
  if (reportStep <= 0) return;

  transitionToReportStep(reportStep - 1, -1);
};

// Used by the Edit buttons on the review screen
const jumpToReportStep = (step) => {
  if (step === reportStep || isTransitioning) return;
  if (reportStep === REPORT_STEPS.length - 1) setReturnToReview(true);

  transitionToReportStep(
    step,
    step > reportStep ? 1 : -1
  );
};

// Allow horizontal swiping in addition to arrow navigation
const reportStepPanResponder = PanResponder.create({
  onMoveShouldSetPanResponder: (_, gestureState) => {
    const { dx, dy } = gestureState;

    return (
      Math.abs(dx) > 24 &&
      Math.abs(dx) > Math.abs(dy) * 1.2
    );
  },

  onPanResponderRelease: (_, gestureState) => {
    // Swipe left = next
    if (gestureState.dx <= -55) {
      goToNextReportStep();
    }

    // Swipe right = back
    else if (gestureState.dx >= 55) {
      goToPreviousReportStep();
    }
  },
});


// The user confirms a map pin; device GPS is optional and is never the
// authority for where litter was observed.
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
  if (skipDraft !== true && currentUserId) {
    try {
      const saved = await loadReportDraft(currentUserId);
      if (saved) {
        Alert.alert('Resume your report?', 'Your details and photos are saved on this device. Your chosen report location is saved with your draft.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start new', style: 'destructive', onPress: async () => { await clearReportDraft(currentUserId); openReportLocationPicker(true); } },
          { text: 'Resume draft', onPress: () => beginReportAtCoordinate(saved.coordinate, saved.form, saved.step, saved.missingPhotoCount) },
        ]);
        return;
      }
    } catch { Alert.alert('Draft unavailable', 'Your saved report could not be loaded. Please try again.'); return; }
  }
  if (!navigation.isFocused()) return;
  const coord = mapCenterCoordinate(region);
  if (!coord) {
    Alert.alert('Map location unavailable', 'Move the map and try again.');
    return;
  }
  if (!isPermanentUser(currentUser)) {
    setPendingAction(null);
    setPendingReportCoordinate(coord);
    navigation.getParent()?.navigate('Auth');
    return;
  }
  setSelectedReport(null);
  setDetailsOpen(false);
  setPreviewId(null);
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
  setReportPlacementActive(false);
  setPlacementCoordinate(null);
  if (editingDraftLocationRef.current) {
    editingDraftLocationRef.current = false;
    setFormOpen(true);
  }
};

const confirmReportLocation = () => {
  const coord = placementCoordinate || mapCenterCoordinate(region);
  if (!coord) {
    Alert.alert('Map location unavailable', 'Move the map and try again.');
    return;
  }

  setReportPlacementActive(false);
  setPlacementCoordinate(null);
  if (editingDraftLocationRef.current) {
    editingDraftLocationRef.current = false;
    setDraftCoord(coord);
    setFormOpen(true);
  } else {
    beginReportAtCoordinate(coord);
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
        title: form.title?.trim() || 'Litter Report',
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
        title: form.title?.trim() || 'Litter Report',
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

        Alert.alert('Couldn’t save report', userMessage(error, 'Your report hasn’t been saved. Please try again.'));
        return;
      }

      if (!isEditing) {
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
      } else {
        Alert.alert(
          'Report saved',
          'Thanks for helping keep the community clean!'
        );
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
      'Select Not now or choose a starting cleanup reward.'
    );
    return;
  }

  if (wantsStartingFunding && !startingContributionCents) {
    Alert.alert(
      'Enter a valid contribution',
      'Choose at least $1 and no more than $1,000, or select Not now.'
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
      isEditing ? 'Discard report changes?' : 'Discard this report?',
      isEditing
        ? 'Your unsaved changes will be lost.'
        : 'Your report details and selected photos will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        ...(!isEditing ? [{ text: 'Save for later', onPress: async () => {
          try { await saveReportDraft(currentUserId, { form, coordinate: draftCoord, step: reportStep }); setFormOpen(false); }
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

// Icon Changes When Map Type Changes
  const getMapTypeColor = () => mapType === 'standard' ? '#4F5C63' : '#2F7D32';


// Preset Litter Options Users Can Choose From
  const LITTER_OPTIONS = [
    { label: 'Takeout cups', icon: 'cafe-outline' },
    { label: 'Bottles', icon: 'water-outline' },
    { label: 'Cans', icon: 'beer-outline' },
    { label: 'Paper products', icon: 'document-text-outline' },
    { label: 'Food wrappers', icon: 'fast-food-outline' },
    { label: 'Fast food bags', icon: 'bag-handle-outline' },
    { label: 'Plastic bags', icon: 'bag-handle-outline' },
    { label: 'Trash bags', icon: 'trash-outline' },
    { label: 'PPE', icon: 'medkit-outline' },
    { label: 'Construction debris', icon: 'construct-outline' },
    { label: 'Furniture', icon: 'bed-outline' },
    { label: 'Strewn plastic', icon: 'layers-outline' },
    { label: 'Textiles', icon: 'shirt-outline' },
    { label: 'Pet waste', icon: 'paw-outline' },
    { label: 'Tires', icon: 'disc-outline' },
    { label: 'Vehicular debris', icon: 'car-outline' },
  ];


// Preset Notes Options Users Can Choose From
  const NOTES_OPTIONS = [
    { label: 'Scattered',        icon: 'layers-outline' },
    { label: 'In a pile',        icon: 'construct-outline' },
    { label: 'Bagged but left',  icon: 'bag-handle-outline' },
    { label: 'Near roadside',    icon: 'car-outline' },
    { label: 'In Public Park',   icon: 'paw-outline' },          // park / nature-ish
    { label: 'In ditch',         icon: 'water-outline' },
    { label: 'Along trail',      icon: 'walk-outline' },         // if walk-outline isn't used yet, it's a standard Ionicon
    { label: 'Near waterway',    icon: 'water-outline' },
    { label: 'Blocking path',    icon: 'close-circle-outline' }, // or trash-outline if you prefer
    { label: 'Broken glass',     icon: 'alert-circle-outline' },
    { label: 'Hard to access',   icon: 'warning-outline' },
    { label: 'Use Caution',      icon: 'warning-outline' },
  ];


// Helper Function for Photo Uploads
  const base64ToUint8Array = (base64) => {
    const binaryString = globalThis.atob ? globalThis.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
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
          const prepared = await preparePhotoForSafetyScan(result.assets[index].uri);
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

    // Upload Photos to Supabase, helper function
    const uploadReportPhotos = async (photoUris, reportId, userId, onProgress = () => {}) => {
      const uploadedPaths = [];
      let completedPhotos = 0;

      try {
        onProgress(
          photoUris.length === 1
            ? 'Preparing and safety-checking your photo…'
            : `Preparing and safety-checking ${photoUris.length} photos…`,
        );
        return await mapInConcurrentBatches(
          photoUris,
          async (uri) => {
            const preparedPhoto = await validatePreparedPhotoForSafetyScan(uri);
            const base64 = await FileSystem.readAsStringAsync(preparedPhoto.uri, {
              encoding: 'base64',
            });
            const bytes = base64ToUint8Array(base64);
            if (bytes.byteLength > 5 * 1024 * 1024) {
              throw new Error('Each report photo must be 5 MB or smaller.');
            }

            const candidateExt = (preparedPhoto.uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
            const fileExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(candidateExt)
              ? candidateExt
              : 'jpg';
            const mimeType = preparedPhoto.mimeType
              ?? `image/${['jpg', 'jpeg'].includes(fileExt) ? 'jpeg' : fileExt}`;
            return uploadSecureMedia({
              userId,
              kind: 'report',
              bytes,
              mimeType,
              subjectId: reportId,
            });
          },
          {
            concurrency: REPORT_PHOTO_UPLOAD_CONCURRENCY,
            onFulfilled: (filePath) => {
              uploadedPaths.push(filePath);
              completedPhotos += 1;
              onProgress(
                `Photo ${completedPhotos} of ${photoUris.length} safety-checked.`,
              );
            },
          },
        );
      } catch (error) {
        if (uploadedPaths.length > 0) {
          const { error: cleanupError } = await supabase.storage
            .from('report_photos')
            .remove(uploadedPaths);
          if (cleanupError) console.log('New report photo cleanup failed:', cleanupError);
        }
        throw error;
      }
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
}, [refreshReportMarkerSnapshots, mapLabels]);

useEffect(() => () => {
  if (reportMarkerTrackingTimerRef.current) {
    clearTimeout(reportMarkerTrackingTimerRef.current);
  }
}, []);

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

// Load Photos into Existing Report
useEffect(() => {
  let active = true;

  const loadPhotoUrls = async () => {
    // Always begin a newly opened report on its first photo

    setPhotosLoading(true);

    if (!selectedReport?.photo_paths?.length) {
      if (active) {
        setReportPhotoUrls([]);
        setPhotosLoading(false);
      }
      return;
    }

    try {
      const urls = await resolveReportPhotoUrls(selectedReport.photo_paths, getReportPhotoUrl, firstUrl => {
        if (active) {
          setReportPhotoUrls([firstUrl]);
          setPhotosLoading(false);
        }
      });

      if (active) {
        setReportPhotoUrls(urls);
      }
    } catch (error) {
      console.log('Report photo loading error:', error);
      if (active) setReportPhotoUrls([]);
    } finally {
      if (active) setPhotosLoading(false);
    }
  };

  loadPhotoUrls();

  return () => {
    active = false;
  };
}, [getReportPhotoUrl, selectedReport?.id, JSON.stringify(selectedReport?.photo_paths), reportOpenRevision]);

useEffect(() => {
  let active = true;

  if (!selectedReport?.id || !isCleanupInProgress(selectedReport) || !currentUserId) {
    setSelectedCleanupAttempt(null);
    setCleanupAttemptLoading(false);
    return undefined;
  }

  setCleanupAttemptLoading(true);
  loadActiveCleanupAttempt(selectedReport.id)
    .then((attempt) => {
      if (active) setSelectedCleanupAttempt(attempt);
    })
    .catch((error) => {
      console.log('Cleanup attempt load error:', error);
      if (active) setSelectedCleanupAttempt(null);
    })
    .finally(() => {
      if (active) setCleanupAttemptLoading(false);
    });

  return () => {
    active = false;
  };
}, [currentUserId, selectedReport?.cleanup_state, selectedReport?.id, reportOpenRevision]);

useEffect(() => {
  let active = true;

  if (!selectedReport?.id || selectedReport.cleanup_state !== 'completed') {
    setCompletedCleanupImpact(null);
    setCompletedCleanupImpactError(null);
    setCompletedCleanupImpactLoading(false);
    return undefined;
  }

  setCompletedCleanupImpactLoading(true);
  setCompletedCleanupImpactError(null);

  loadCompletedCleanupImpact(selectedReport.id)
    .then((impact) => {
      if (!active) return;
      setCompletedCleanupImpact(impact);
      if (!impact) setCompletedCleanupImpactError('cleanup_impact_unavailable');
    })
    .catch((error) => {
      console.log('Completed cleanup impact load error:', error);
      if (active) {
        setCompletedCleanupImpact(null);
        setCompletedCleanupImpactError(error?.message || 'cleanup_impact_unavailable');
      }
    })
    .finally(() => {
      if (active) setCompletedCleanupImpactLoading(false);
    });

  return () => {
    active = false;
  };
}, [
  completedCleanupImpactReloadKey,
  reportOpenRevision,
  selectedReport?.cleanup_state,
  selectedReport?.id,
]);


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
    if (!detailsOpen) setReportShareSheetOpen(false);
  }, [detailsOpen]);

  useEffect(() => {
    setReportShareSheetOpen(false);
  }, [selectedReport?.id]);

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

  const selectedReportShareModel = () => createReportShareModel({
    report: selectedReport,
    impact: completedCleanupImpact,
    beforePhotoUrl: reportPhotoUrls[0] ?? null,
    afterPhotoUrl: completedCleanupImpact?.afterPhotoUrls?.[0] ?? null,
  });

  const prepareSelectedReportShareImage = async () => {
    const model = selectedReportShareModel();
    if (!model) return null;

    return prepareNativeReportShareImage({
      model,
      cacheDirectory: FileSystem.cacheDirectory,
      deleteAsync: FileSystem.deleteAsync,
      getInfoAsync: FileSystem.getInfoAsync,
      readAsStringAsync: FileSystem.readAsStringAsync,
      downloadAsync: FileSystem.downloadAsync,
    });
  };

  const shareMapReport = async (report) => {
    if (!isReportShareable(report) || reportShareBusyAction) return;
    setReportShareBusyAction('system');
    try {
      await shareReportWithSystemSheet({ report, platform: Platform.OS, share: NativeShare.share });
    } catch (error) {
      Alert.alert('Sharing unavailable', 'We couldn’t open the share menu. Please try again.');
    } finally {
      setReportShareBusyAction(null);
    }
  };

  const shareSelectedReport = async () => {
    if (!selectedReportIsShareable || reportShareBusyAction) return;

    setReportShareBusyAction('system');
    try {
      let shareImageUri = null;
      try {
        shareImageUri = await prepareSelectedReportShareImage();
      } catch (imageError) {
        console.log('Report share image unavailable:', imageError);
      }

      await shareReportWithSystemSheet({
        report: selectedReport,
        impact: completedCleanupImpact,
        beforePhotoUrl: reportPhotoUrls[0] ?? null,
        afterPhotoUrl: completedCleanupImpact?.afterPhotoUrls?.[0] ?? null,
        platform: Platform.OS,
        share: installedRNShare?.open ?? NativeShare.share,
        shareImageUri: installedRNShare ? shareImageUri : null,
      });
      setReportShareSheetOpen(false);
    } catch (error) {
      console.log('Report sharing error:', error);
      Alert.alert('Sharing unavailable', 'We couldn’t open the share menu. Please try again.');
    } finally {
      setReportShareBusyAction(null);
    }
  };

  const shareSelectedReportToInstagram = async () => {
    if (!selectedReportIsShareable || reportShareBusyAction) return;

    if (!installedRNShare?.shareSingle || !installedRNShare.Social?.INSTAGRAM_STORIES) {
      Alert.alert(
        'Instagram sharing unavailable',
        'We couldn’t open Instagram Stories. You can still send this report with “Choose where to share”.'
      );
      return;
    }

    let instagramAvailable = false;
    try {
      instagramAvailable = await isInstagramStoriesAvailable({
        platform: Platform.OS,
        isPackageInstalled: installedRNShare.isPackageInstalled,
        canOpenURL: url => Linking.canOpenURL(url),
      });
    } catch (error) {
      console.log('Instagram availability check error:', error);
    }

    if (!instagramAvailable) {
      Alert.alert(
        'Instagram isn’t available',
        'Instagram isn’t available on this phone. Try “Choose where to share” to send the report another way.'
      );
      return;
    }

    setReportShareBusyAction('instagram');
    try {
      const shareImageUri = await prepareSelectedReportShareImage();
      if (!shareImageUri) throw new Error('share_image_unavailable');

      await shareReportToInstagramStories({
        report: selectedReport,
        impact: completedCleanupImpact,
        beforePhotoUrl: reportPhotoUrls[0] ?? null,
        afterPhotoUrl: completedCleanupImpact?.afterPhotoUrls?.[0] ?? null,
        shareImageUri,
        shareSingle: installedRNShare.shareSingle,
        instagramStoriesSocial: installedRNShare.Social.INSTAGRAM_STORIES,
      });
      setReportShareSheetOpen(false);
    } catch (error) {
      console.log('Instagram sharing error:', error);
      const unavailable = /not installed|activity not found|package/i.test(error?.message || '');
      Alert.alert(
        unavailable ? 'Instagram isn’t available' : 'Instagram sharing unavailable',
        unavailable
          ? 'Instagram isn’t available on this phone. Try “Choose where to share” to send the report another way.'
          : 'We couldn’t prepare your Story. Please try again, or use “Choose where to share”.'
      );
    } finally {
      setReportShareBusyAction(null);
    }
  };
  const cleanupStatus = cleanupStatusPresentation(
    selectedReport,
    currentUserIsCleaner,
    currentUserIsReporter
  );

  const openFundingContribution = async ({ reportId }) => {
    if (!reportId || payoutGateBusy) return;

    if (!currentUserId) {
      setPendingReportCoordinate(null);
      setPendingAction({ kind: 'fund', reportId });
      setDetailsOpen(false);
      navigation.getParent()?.navigate('Auth');
      return;
    }

    reopenReportOnFocus.current = true;
    setDetailsOpen(false);
    navigation.getParent()?.navigate('FundingContribution', { reportId });
  };

  const executeCleanupClaim = async ({
    report = selectedReport,
    skipPayoutConnectionCheck = false,
    reopenDetailsOnSuccess = false,
  } = {}) => {
    if (!report?.id || cleanupActionBusy) return;

    try {
      setCleanupActionBusy(true);
      if (!skipPayoutConnectionCheck && cleanupClaimRequiresPayoutSetup(report)) {
        const payout = await loadPayoutStatus();
        if (!isPayoutConnectionReady(payout)) {
          openPayoutSetupForWorkflow({
            kind: PAYOUT_WORKFLOW_KIND.CLEANUP_CLAIM,
            reportId: report.id,
          });
          return;
        }
      }
      const claimedAttempt = await claimCleanup(report.id);

      const claimedReport = {
        ...report,
        cleanup_state: 'claimed',
      };

      setSelectedCleanupAttempt(claimedAttempt);
      setSelectedReport(claimedReport);
      upsertReport(claimedReport);
      if (reopenDetailsOnSuccess) setDetailsOpen(true);

      Alert.alert(
        'Cleanup claimed',
        `Complete by ${new Date(claimedAttempt.claim_expires_at).toLocaleString()}.`
      );
    } catch (error) {
      if (/cleaner_payout_onboarding_required/i.test(error?.message ?? '')) {
        openPayoutSetupForWorkflow({
          kind: PAYOUT_WORKFLOW_KIND.CLEANUP_CLAIM,
          reportId: report.id,
        });
      } else {
        Alert.alert('Unable to claim cleanup', cleanupActionMessage(error));
      }
      await refreshReports({ showRefresh: false });
    } finally {
      setCleanupActionBusy(false);
    }
  };

  const confirmCleanupClaim = () => {
    if (!cleanupEligible) return;

    Alert.alert(
      'Claim this cleanup?',
      "You'll have 24 hours to complete the cleanup and submit your results.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim Cleanup',
          onPress: executeCleanupClaim,
        },
      ]
    );
  };

  const beginCleanupClaim = async () => {
    if (!currentUserId && cleanupDiscoverable) {
      setPendingReportCoordinate(null);
      setPendingAction({ kind: 'cleanup', reportId: selectedReport.id });
      setDetailsOpen(false);
      navigation.getParent()?.navigate('Auth');
      return;
    }
    if (cleanupActionBusy || !cleanupEligible) return;

    try {
      setCleanupActionBusy(true);
      const waiverStatus = await loadCurrentCleanupWaiver();
      setCleanupWaiver(waiverStatus.waiver);
      setCleanupWaiverQueued(true);
      setDetailsOpen(false);
    } catch (error) {
      Alert.alert('Unable to start cleanup', cleanupActionMessage(error));
    } finally {
      setCleanupActionBusy(false);
    }
  };

  const acceptWaiverAndContinue = async () => {
    if (!cleanupWaiver || cleanupActionBusy) return;

    try {
      setCleanupActionBusy(true);
      await acceptCleanupWaiver(cleanupWaiver);
      setCleanupWaiverOpen(false);
      setReportReopenQueued(true);
      setClaimConfirmationQueued(true);
    } catch (error) {
      if (/cleanup_waiver_outdated/i.test(error?.message ?? '')) {
        try {
          const waiverStatus = await loadCurrentCleanupWaiver();
          setCleanupWaiver(waiverStatus.waiver);
        } catch (refreshError) {
          console.log('Cleanup waiver refresh error:', refreshError);
        }
      }

      Alert.alert('Unable to start cleanup', cleanupActionMessage(error));
    } finally {
      setCleanupActionBusy(false);
    }
  };

  useEffect(() => {
    if (
      !claimConfirmationQueued
      || !detailsOpen
      || cleanupWaiverOpen
      || cleanupActionBusy
    ) return undefined;

    const timer = setTimeout(() => {
      setClaimConfirmationQueued(false);
      confirmCleanupClaim();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    claimConfirmationQueued,
    cleanupActionBusy,
    cleanupWaiverOpen,
    detailsOpen,
    selectedReport?.id,
  ]);

  useEffect(() => {
    if (!isMapScreenFocused || !pendingPayoutWorkflowToken) return undefined;

    const workflow = consumePayoutWorkflow(pendingPayoutWorkflowToken);
    if (!workflow) return undefined;
    setPendingPayoutWorkflowToken(null);

    if (workflow.status === 'cancelled') {
      setDetailsOpen(true);
      Alert.alert(
        'Stripe setup not completed',
        'The funded cleanup was not claimed. You can try again when you’re ready.'
      );
      return undefined;
    }

    let active = true;
    const resume = async () => {
      if (workflow.action.kind === PAYOUT_WORKFLOW_KIND.CLEANUP_CLAIM) {
        const report = selectedReport?.id === workflow.action.reportId
          ? selectedReport
          : await getReportById(workflow.action.reportId);
        if (!active) return;
        if (!report) {
          Alert.alert('Report unavailable', 'This litter report is no longer available.');
          return;
        }
        await executeCleanupClaim({
          report,
          skipPayoutConnectionCheck: true,
          reopenDetailsOnSuccess: true,
        });
      }
    };

    resume().catch((error) => {
      if (active) {
        Alert.alert('Unable to continue', userMessage(error, 'Please reopen the cleanup and try again.'));
      }
    });

    return () => {
      active = false;
    };
  }, [isMapScreenFocused, pendingPayoutWorkflowToken]);

  const openExternalMap = async (preferredUrl, fallbackUrl) => {
    try {
      const supported = await Linking.canOpenURL(preferredUrl);
      await Linking.openURL(supported ? preferredUrl : fallbackUrl);
    } catch (error) {
      console.log('Cleanup navigation error:', error);

      try {
        await Linking.openURL(fallbackUrl);
      } catch (fallbackError) {
        console.log('Cleanup navigation fallback error:', fallbackError);
        Alert.alert('Unable to open maps', 'Try opening the report location in your maps app.');
      }
    }
  };

  const openCleanupNavigation = () => {
    const urls = cleanupNavigationUrls(selectedReport);

    if (!urls) {
      Alert.alert('Location unavailable', 'This report does not have a valid cleanup location.');
      return;
    }

    if (Platform.OS === 'ios') {
      Alert.alert(
        'Navigate to Cleanup',
        CLEANUP_NAVIGATION_SAFETY_REMINDER,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apple Maps',
            onPress: () => openExternalMap(urls.apple, urls.google),
          },
          {
            text: 'Google Maps',
            onPress: () => openExternalMap(urls.google, urls.google),
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Navigate to Cleanup',
      CLEANUP_NAVIGATION_SAFETY_REMINDER,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Maps',
          onPress: () => openExternalMap(urls.android, urls.google),
        },
      ]
    );
  };

  const openCleanupSubmission = () => {
    if (!selectedCleanupAttempt?.id || !selectedReport?.id) return;

    setDetailsOpen(false);
    navigation.getParent()?.navigate('CleanupSubmission', {
      cleanupId: selectedCleanupAttempt.id,
      reportId: selectedReport.id,
    });
  };

  const openCleanupReview = () => {
    if (!selectedCleanupAttempt?.id || !selectedReport?.id) return;

    setDetailsOpen(false);
    navigation.getParent()?.navigate('CleanupReview', {
      cleanupId: selectedCleanupAttempt.id,
      reportId: selectedReport.id,
    });
  };

  const openCleanupFeedback = () => {
    if (!selectedCleanupAttempt?.id || !selectedReport?.id) return;

    setDetailsOpen(false);
    navigation.getParent()?.navigate('CleanupFeedback', {
      cleanupId: selectedCleanupAttempt.id,
      reportId: selectedReport.id,
    });
  };

  const executeCleanupRelease = async () => {
    if (!selectedCleanupAttempt?.id || cleanupActionBusy) return;

    try {
      setCleanupActionBusy(true);
      const releasedAttempt = await releaseCleanup(selectedCleanupAttempt.id);
      const availableReport = {
        ...selectedReport,
        cleanup_state: 'available',
      };

      setSelectedCleanupAttempt(null);
      setSelectedReport(availableReport);
      upsertReport(availableReport);

      Alert.alert(
        releasedAttempt.status === 'expired' ? 'Claim expired' : 'Cleanup released',
        'This report is available for another volunteer.'
      );
    } catch (error) {
      Alert.alert('Unable to release cleanup', cleanupActionMessage(error));
    } finally {
      setCleanupActionBusy(false);
    }
  };

  const confirmCleanupRelease = () => {
    Alert.alert(
      'Release this cleanup?',
      'This report will become available for another volunteer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Cleanup',
          style: 'destructive',
          onPress: executeCleanupRelease,
        },
      ]
    );
  };

// Links out to Patreon Account
// const openPatreon = async () => {
//   try {
//     const supported = await Linking.canOpenURL(PATREON_URL);
//     if (!supported) {
//       Alert.alert("Can't open link", "Unable to open Patreon on this device.");
//       return;
//     }
//     await Linking.openURL(PATREON_URL);
//   } catch (e) {
//     console.log("Patreon link error:", e);
//     Alert.alert("Link error", "Something went wrong opening Patreon.");
//   }
// };

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
        <MapView
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
          onRegionChangeComplete={(nextRegion) => {
            setProjectionRevision((value) => value + 1);
            if (reportPlacementActive) {
              setPlacementCoordinate(mapCenterCoordinate(nextRegion));
            }
            if (!mapRegionsAreEquivalent(region, nextRegion)) {
              refreshReportMarkerSnapshots();
              setRegion(nextRegion);
            }
          }}
          onLayout={(event) => setMapSize(event.nativeEvent.layout)}
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
          mapType={mapType}
        >

        {polygonParts(searchPlace?.geometry).map(([outer, ...holes], index) => <Polygon key={`${searchPlace.id}:${index}`}
          coordinates={outer.map(([longitude, latitude]) => ({ latitude, longitude }))}
          holes={holes.map(ring => ring.map(([longitude, latitude]) => ({ latitude, longitude })))}
          strokeColor="#2F7D32" accessible={false} importantForAccessibility="no" strokeWidth={1.5} fillColor="rgba(47,125,50,0.035)" tappable={false} />)}
        <ReportMapMarkers markers={mapLabels} selectedId={previewId} tracksViewChanges={tracksReportMarkers}
          reportPlacementActive={reportPlacementActive} onChoose={chooseMapReport}
          onNearby={(ids) => { setPreviewId(null); setNearbyIds(ids); }} />

        {draftCoord && (
          <Marker
            coordinate={draftCoord}
            cluster={false}
            pinColor="#2F7D32"
            title="Draft report"
            description="Fill the form below to save"
          />
        )}
      </MapView>

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
            style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginTop: 8 }}>
            <Text style={{ color: '#37463D', fontWeight: '600' }}>Reports couldn’t refresh. Tap to try again.</Text>
          </TouchableOpacity> : null}
          {searchPlace && !reportPlacementActive && !mapRegionsAreEquivalent(region, searchPlace.region) ? <TouchableOpacity onPress={() => { setPreviewId(null); commitMapRegion(searchPlace.region); }} accessibilityRole="button" accessibilityLabel="Re-center selected search area" style={{ alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', marginTop: 8 }}><Text style={{ color: '#285D38', fontWeight: '600' }}>Re-center</Text></TouchableOpacity> : null}

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
            <Text style={styles.floatingMapInstructionTitle}>Choose report location</Text>
            <Text style={styles.floatingMapInstructionHint}>Move the map beneath the pin to mark the litter. Zoom in for a precise spot.</Text>
          </Animated.View>
        </View>
      ) : null}

      {reportPlacementActive ? (
        <View
          style={styles.reportPlacementPinArea}
          pointerEvents="none"
          accessible={false}
        >
          <Ionicons name="location-sharp" size={54} color="#C53232" style={{ transform: [{ translateY: -24 }] }} />
          <View style={{ position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#C53232', borderWidth: 1, borderColor: '#FFFFFF' }} />
        </View>
      ) : null}

        {/* Support Button (Patreon) */}
        {/* <TouchableOpacity
          style={styles.supportButton}
          onPress={openPatreon}
          accessibilityRole="button"
          accessibilityLabel="Support Litterbugs on Patreon"
        >
          <Ionicons name="heart" size={22} color="#E53935" />
        </TouchableOpacity> */}


      <View
        style={[styles.reportLitterButtonDock, { bottom: mapControlsBottom }, previewReport && !reportPlacementActive && { display: 'none' }]}
        pointerEvents="box-none"
      >
        <Animated.View
          pointerEvents={reportPlacementActive ? 'auto' : 'none'}
          style={[
            styles.reportPlacementCloseWrap,
            fontScale > 1.5 && { bottom: 90 * fontScale },
            {
              opacity: reportControlTransition,
              transform: [
                {
                  translateX: reportControlTransition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
                {
                  scale: reportControlTransition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.82, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.reportPlacementClose}
            onPress={cancelReportLocationPicker}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Cancel report location"
            accessibilityHint="Closes the report pin and returns to normal map browsing"
          >
            <Ionicons name="close" size={27} color="#374151" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            transform: [
              {
                scale: reportControlTransition.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.97, 1],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={[styles.reportLitterButton, { width: fontScale > 1.5 ? screenWidth - 32 : reportPlacementActive ? Math.min(screenWidth - 100, 194 + 120 * (fontScale - 1)) : Math.max(152, Math.min(screenWidth - 148, 44 + 108 * fontScale)), height: fontScale > 1.5 ? undefined : BOTTOM_NAV_METRICS.mapControlSize, minHeight: 44, paddingVertical: fontScale > 1.5 ? 12 : 0 }]}
            onPress={reportPlacementActive ? confirmReportLocation : openReportLocationPicker}
            disabled={showInitialMapLoading || formOpen || detailsOpen || isSaving}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={reportPlacementActive ? 'Use this location' : 'Report litter'}
            accessibilityHint={reportPlacementActive
              ? 'Uses the location beneath the red pin for this report'
              : 'Places a pin at the map center so you can choose the cleanup site'}
            accessibilityState={{
              disabled: showInitialMapLoading || formOpen || detailsOpen || isSaving,
            }}
          >
              <Ionicons name={reportPlacementActive ? 'location-outline' : 'add-circle-outline'} size={20} color="#FFFFFF" />
              <Text style={[styles.reportLitterButtonText, { flexShrink: 1, textAlign: 'center' }]}>{reportPlacementActive ? 'Use This Location' : 'Report Litter'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Center Me Button */}
      <TouchableOpacity
        style={[
          styles.centerButton,
          {
            bottom: mapControlsBottom + (previewReport && !reportPlacementActive ? previewHeight + 12 : fontScale > 1.5 ? 90 * fontScale : 58),
          },
        ]}
        onPress={() => { clearSearchPlace(); centerOnUser(); }}
        disabled={isCentering}
        accessibilityRole="button"
        accessibilityLabel={isCentering ? 'Finding your location' : 'Center map on your location'}
        accessibilityState={{ busy: isCentering, disabled: isCentering }}
      >
        {isCentering ? (
          <ActivityIndicator color="#2F7D32" />
        ) : (
          <Ionicons name="navigate-outline" size={24} color="#4F5C63" />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.mapTypeButton,
          {
            bottom: mapControlsBottom + (previewReport && !reportPlacementActive ? previewHeight + 12 : fontScale > 1.5 ? 90 * fontScale : 58) + BOTTOM_NAV_METRICS.mapControlSize + 10,
          },
        ]}
        onPress={toggleMapType}
        accessibilityRole="button"
        accessibilityLabel="Change map style"
        accessibilityValue={{ text: mapType }}
      >
        <Ionicons name="layers-outline" size={24} color={getMapTypeColor()} />
      </TouchableOpacity>

{!reportPlacementActive && !detailsOpen && !showInitialMapLoading ? <MapReportPreview
        report={previewReport} nearby={nearbyReports} bottom={mapControlsBottom}
        insetBottom={insets.bottom} getPhotoUrl={getReportPhotoUrl}
        onHeight={setPreviewHeight}
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
<Modal
  visible={formOpen}
  animationType="slide"
  transparent
  onRequestClose={cancelDraft}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.wizardKeyboardView}>
      <View style={styles.wizardSheet}>

        {isSaving && (
          <View
            style={styles.savingOverlay}
            pointerEvents="auto"
            accessibilityRole="progressbar"
            accessibilityLabel={saveStage}
          >
            <View style={styles.savingCard}>
              <ActivityIndicator size="large" color="#2F7D32" />
              <Text style={styles.savingTitle}>
                Creating your report
              </Text>
              <Text style={styles.savingStatus}>{saveStage}</Text>

            </View>
          </View>
        )}


        {!isEditing && draftSaveError ? <Text style={{ color: '#B42318', paddingHorizontal: 20 }}>Draft could not be saved. Keep this screen open and try Save for later again.</Text> : null}
        {/* Persistent Header */}
        <View style={styles.wizardHeader}>

          <View style={{ flex: 1 }}>
            <Text style={styles.wizardHeaderTitle}>
              {reportStep === 4
                ? 'Review report'
                : isEditing ? 'Edit Litter Report' : 'New Litter Report'}
            </Text>


          </View>

          <TouchableOpacity
            style={styles.wizardCloseButton}
            onPress={cancelDraft}
            disabled={isSaving || Boolean(photoPreparationStatus)}
            accessibilityRole="button"
            accessibilityLabel="Close report form"
          >
            <Ionicons
              name="close"
              size={25}
              color="#374151"
            />
          </TouchableOpacity>

        </View>


        <View style={styles.wizardDivider} />


        {/* Animated Page */}
        <Animated.View
          {...reportStepPanResponder.panHandlers}
          style={[
            styles.wizardPage,
            {
              opacity: stepOpacity,

              transform: [
                {
                  translateX:
                    stepTranslateX,
                },
              ],
            },
          ]}
        >
          <ScrollView
            key={reportStep}
            ref={reportWizardScrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets={false}
            onContentSizeChange={() => {
              // Focus can fire before the keyboard opens and before its inset
              // is laid out. Reveal the field again using the final content size.
              if (reportKeyboardVisible) {
                reportWizardScrollRef.current?.scrollToEnd({ animated: true });
              }
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.wizardScrollContent,
              reportKeyboardVisible && { paddingBottom: reportKeyboardHeight + 32 },
            ]}
          >
            <TouchableWithoutFeedback
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <View style={styles.wizardDismissArea}>
                <ReportWizardSteps
                  onChangeLocation={changeDraftLocation}
                  coordinate={isEditing ? selectedReport : draftCoord}
                  form={form}
                  isEditing={isEditing}
                  reportPhotoUrls={reportPhotoUrls}
                  reportStep={reportStep}
                  selectedReport={selectedReport}
                  pickImage={pickImage}
                  isSaving={isSaving || Boolean(photoPreparationStatus)}
                  showPhotoPreparation={showPhotoPreparation && isPreparingPhotos}
                  setForm={setForm}
                  removePhoto={removePhoto}
                  hasAttachedReportPhoto={hasAttachedReportPhoto}
                  goToNextReportStep={goToNextReportStep}
                  LITTER_OPTIONS={LITTER_OPTIONS}
                  revealBottomReportField={revealBottomReportField}
                  NOTES_OPTIONS={NOTES_OPTIONS}
                  jumpToReportStep={jumpToReportStep}
                  fundingEnabled={fundingEnabled}
                  wantsStartingFunding={wantsStartingFunding}
                  startingContributionCents={startingContributionCents}
                  hasStartingFundingChoice={hasStartingFundingChoice}
                  submitReport={submitReport}
                />
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </Animated.View>


        {/* Persistent bottom navigation */}
        {!reportKeyboardVisible && (
          <View style={styles.wizardFooter}>

          {/* LEFT */}
          <TouchableOpacity
            style={styles.wizardArrowButton}
            onPress={goToPreviousReportStep}
            disabled={
              reportStep === 0 ||
              isTransitioning ||
              isSaving
            }
            accessibilityRole="button"
            accessibilityLabel="Previous report step"
          >
            <Ionicons
              name="arrow-back-circle"
              size={39}
              color={
                reportStep === 0 ||
                isTransitioning ||
                isSaving
                  ? '#D1D5DB'
                  : '#4B5563'
              }
            />
          </TouchableOpacity>


          {/* DOTS */}
          <View style={styles.wizardProgress}>
            <Text style={styles.wizardProgressText}>
              {reportStep + 1} of {REPORT_STEPS.length}
            </Text>
            <View style={styles.wizardDots}>
              {REPORT_STEPS.map(
                (step, index) => (
                  <View
                    key={step}
                    style={[
                      styles.wizardDot,

                      index === reportStep &&
                        styles.wizardDotActive,
                    ]}
                  />
                )
              )}
            </View>
          </View>


          {/* Keep the footer balanced, with no forward action on the final step. */}
          {reportStep < REPORT_STEPS.length - 1 ? (
            <TouchableOpacity
              style={styles.wizardArrowButton}
              onPress={goToNextReportStep}
              disabled={!canAdvanceFromStep(reportStep) || isTransitioning || isSaving || Boolean(photoPreparationStatus)}
              accessibilityRole="button"
              accessibilityLabel={returnToReview ? "Return to review" : "Next report step"}
            >
              <Ionicons name="arrow-forward-circle" size={39}
                color={!canAdvanceFromStep(reportStep) || isTransitioning || isSaving || Boolean(photoPreparationStatus) ? '#D1D5DB' : '#4B5563'} />
            </TouchableOpacity>
          ) : <View style={styles.wizardArrowButton} accessible={false} />}

          </View>
        )}
      </View>
    </View>
  </View>
</Modal>

{/* ============================= */}
{/* Redesigned Report Detail View */}
{/* ============================= */}

<ReportDetailsSheet state={{ detailsOpen, reportShareSheetOpen, reportShareBusyAction, selectedReport, insets, region, reportDetailsPreparing, selectedReportHasUtilityActions, completedCleanupImpact, completedCleanupImpactLoading, completedCleanupImpactError, reportHeroWidth, currentUserId, reportPhotoUrls, photosLoading, geminiReviewEnabled, userOwnsSelectedReport, reportFundingFeedback, cleanupDiscoverable, cleanupStatus, currentUserIsCleaner, selectedCleanupAttempt, cleanupAttemptLoading, cleanupActionBusy, canEditOrDeleteSelectedReport, selectedReportCanOpenFunding, payoutGateBusy, selectedReportIsShareable }}
  actions={{ setReportShareSheetOpen, closeReportDetails, setDetailsOpen, setSelectedReport, setPreviewId, navigation, commitMapRegion, setCompletedCleanupImpact, setCompletedCleanupImpactError, setCompletedCleanupImpactLoading, setCompletedCleanupImpactReloadKey, openCleanupNavigation, openCleanupSubmission, confirmCleanupRelease, openCleanupFeedback, openCleanupReview, beginCleanupClaim, openFundingContribution, removeReport, setForm, setEditingReportId, setIsEditing, setDraftCoord, resetReportWizard, setFormOpen, shareSelectedReport, shareSelectedReportToInstagram, editReportPhotos }} />

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
