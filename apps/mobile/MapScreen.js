import MapReportPreview from './components/MapReportPreview';
import useMapLabels from './lib/useMapLabels';
import { reportsNearMapTap } from './lib/mapLabelLayout';
import ReportPhotoGallery from './components/ReportPhotoGallery';
import { saveReportDraft, loadReportDraft, clearReportDraft } from './lib/savedReportDraft';
import ReportFilters from './components/ReportFilters';
// MapScreen.js
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Keyboard,
  Animated,
  Easing,
  PanResponder,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
  AppState,
  Linking,
  Share as NativeShare,
  TurboModuleRegistry,
  useWindowDimensions,
} from 'react-native';
import { polygonParts } from './lib/searchGeography';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandedLoadingState, { LoadingButtonContent } from './BrandedLoadingState';
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
import ReporterIdentity from './ReporterIdentity';
import CompletedCleanupStory from './CompletedCleanupStory';
import CleanupWaiverModal from './CleanupWaiverModal';
import ReportShareSheet from './ReportShareSheet';
import {
  acceptCleanupWaiver,
  acknowledgeCleanupNotifications,
  claimCleanup,
  loadActiveCleanupAttempt,
  loadCurrentCleanupWaiver,
  loadUnreadCleanupNotifications,
  releaseCleanup,
} from './lib/cleanup';
import {
  canOfferCleanup,
  cleanupActionMessage,
  cleanupMapTone,
  cleanupStatusPresentation,
  isCleanupInProgress,
  isCurrentCleaner,
} from './lib/cleanupEligibility';
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
import {
  formatUsd,
  loadCleanupFeatureFlags,
  loadPayoutStatus,
  loadReportFundingFeedback,
  requestGeminiReview,
} from './lib/funding';
import { calculatePlatformFee, parseContributionAmount } from './lib/fundingMath';
import { savePendingReportFunding } from './lib/pendingReportFunding';
import {
  PAYOUT_WORKFLOW_KIND,
  cleanupClaimRequiresPayoutSetup,
  consumePayoutWorkflow,
  createPayoutWorkflow,
  isPayoutConnectionReady,
} from './lib/payoutWorkflowGate';
import { hasRequiredReportPhoto } from './lib/reportDraft';
import {
  MAX_REPORT_PHOTOS,
  mergeReportPhotoUris,
  reportCameraPickerOptions,
  reportPhotoPickerOptions,
} from './lib/reportPhotoSelection';
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
  reportLocationRegion,
  userLocationRegion,
} from './lib/responsiveLocation';
import { mapCenterCoordinate } from './lib/reportLocationPlacement';
import {
  evaluateReportLocationDistance,
  MAX_REPORT_DISTANCE_MILES,
  roundedDistanceLabel,
} from './lib/reportLocationPolicy';
import {
  reportWithdrawalErrorMessage,
  withdrawOwnReport,
} from './lib/reportWithdrawal';
import {
  createReportShareModel,
  isInstagramStoriesAvailable,
  isReportShareable,
  prepareNativeReportShareImage,
  reportShareActionLabel,
  shareReportToInstagramStories,
  shareReportWithSystemSheet,
} from './lib/reportSharing';
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

const formatFriendlyDateTime = (value) => new Date(value).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

// State Functions
export default function MapScreen({ route, navigation, onLaunchReady }) {
  const isMapScreenFocused = useIsFocused();
  const REPORT_STEPS = [
    'Title',
    'Photos',
    'Litter Types',
    'Severity',
    'Notes',
    'Review',
  ];
  const [tracksReportMarkers, setTracksReportMarkers] = useState(true);
  const reportMarkerTrackingTimerRef = useRef(null);

  const [draftCoord, setDraftCoord] = useState(null);
  const [reportPlacementActive, setReportPlacementActive] = useState(false);
  const [placementCoordinate, setPlacementCoordinate] = useState(null);
  const reportControlTransition = useRef(new Animated.Value(0)).current;
  const [formOpen, setFormOpen] = useState(false);
  const [reportKeyboardVisible, setReportKeyboardVisible] = useState(false);
  const [reportStep, setReportStep] = useState(0);
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveStage, setSaveStage] = useState('Saving report…');
  const [photoPreparationStatus, setPhotoPreparationStatus] = useState(null);
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
  const [reportLocationVerification, setReportLocationVerification] = useState('idle');
  const reportLocationRequestRef = useRef(0);
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
    markers,
    restoredMap, searchPlace, clearSearchPlace, selectedMapReportId: previewId, setSelectedMapReportId: setPreviewId,
    mapRegion: region,
    setMapRegion: setRegion,
    commitMapRegion,
    loading: reportsLoading,
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
    permissionMessage = 'Allow location access to center the map on your position.',
    regionForPosition = userLocationRegion,
    accuracy = Location.Accuracy.Balanced,
  } = {}) => {
    let permission = await Location.getForegroundPermissionsAsync();

    if (permission.status !== 'granted' && permission.canAskAgain !== false) {
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

    locateAndCenterMap({ showPermissionAlert: false })
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
      () => setReportKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => setReportKeyboardVisible(false)
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
const canAdvanceFromStep = (step = reportStep) => {
  // Every report needs enough visual context for discovery and cleanup review.
  // Existing photos satisfy the requirement when a report is being edited.
  if (step === 1) {
    return hasAttachedReportPhoto();
  }

  // Litter Types are required.
  // Either a preset selection OR something typed in "Other" counts.
  if (step === 2) {
    return (
      (form.selectedTypes?.length ?? 0) > 0 ||
      Boolean(form.types?.trim())
    );
  }

  // Severity is required
  if (step === 3) {
    return Boolean(form.severity);
  }

  // All other steps are optional
  return true;
};

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
  if (reportStep >= REPORT_STEPS.length - 1) return;

  if (!canAdvanceFromStep(reportStep)) return;

  transitionToReportStep(reportStep + 1, 1);
};

const goToPreviousReportStep = () => {
  if (reportStep <= 0) return;

  transitionToReportStep(reportStep - 1, -1);
};

// Used by the Edit buttons on the review screen
const jumpToReportStep = (step) => {
  if (step === reportStep) return;

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


// Calculate distance between two GPS coordinates using the Haversine formula
const getDistanceMiles = (pointA, pointB) => {
  const EARTH_RADIUS_MILES = 3958.8;

  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const lat1 = toRadians(pointA.latitude);
  const lon1 = toRadians(pointA.longitude);
  const lat2 = toRadians(pointB.latitude);
  const lon2 = toRadians(pointB.longitude);

  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
};

// Reports can only be created near the user's current GPS location
const beginReportAtCoordinate = async (coord, savedForm = null) => {
  if (!navigation.isFocused()) return;

  const requestId = reportLocationRequestRef.current + 1;
  reportLocationRequestRef.current = requestId;

  // Open the workflow immediately so a fresh GPS fix never makes the tap feel
  // unresponsive. Location verification continues in the background, and the
  // user cannot advance until the selected coordinate has been approved.
  setDraftCoord(coord);
  setForm(savedForm || {
    title: '',
    selectedTypes: [],
    types: '',
    photos: [],
    severity: '',
    selectedNotes: [],
    notes: '',
    startingFundingChoice: 'none',
    startingFundingOther: '',
  });
  resetReportWizard();
  setReportLocationVerification('checking');
  setFormOpen(true);

  const isCurrentRequest = () => reportLocationRequestRef.current === requestId;

  const closeUnverifiedDraft = ({ returnToPlacement = false } = {}) => {
    if (!isCurrentRequest()) return;
    setDraftCoord(null);
    setFormOpen(false);
    setReportLocationVerification('idle');
    resetReportWizard();
    if (returnToPlacement) {
      setPlacementCoordinate(coord);
      setReportPlacementActive(true);
    }
  };

  try {
    // Check whether location permission is available
    let permission = await Location.getForegroundPermissionsAsync();

    if (!isCurrentRequest()) return;
    if (!navigation.isFocused()) {
      closeUnverifiedDraft();
      return;
    }

    if (permission.status !== 'granted' && permission.canAskAgain !== false) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (!isCurrentRequest()) return;
    if (!navigation.isFocused()) {
      closeUnverifiedDraft();
      return;
    }

    if (permission.status !== 'granted') {
      closeUnverifiedDraft();
      showLocationSettingsAlert(
        'Litterbugs uses your current area to confirm the selected report location.'
      );
      return;
    }

    setLocationPermissionGranted(true);

    // Get the user's current GPS location
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // The location request can outlive the user's visit to the map. Do not
    // open a form or show an alert over another tab after they navigate away.
    if (!isCurrentRequest()) return;
    if (!navigation.isFocused()) {
      closeUnverifiedDraft();
      return;
    }

    const userCoord = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };

    // Calculate distance from user to selected report location
    const distanceMiles = getDistanceMiles(userCoord, coord);

    const distancePolicy = evaluateReportLocationDistance(distanceMiles);

    if (distancePolicy.status === 'blocked') {
      closeUnverifiedDraft({ returnToPlacement: true });
      Alert.alert(
        'Report Location Too Far Away',
        `This pin is about ${roundedDistanceLabel(distanceMiles)} from you. Move it within ${MAX_REPORT_DISTANCE_MILES} miles to create a report.`,
        [{ text: 'Move pin' }]
      );
      return;
    }

    if (distancePolicy.status === 'invalid') {
      closeUnverifiedDraft({ returnToPlacement: true });
      Alert.alert(
        'Unable to Verify Location',
        'Litterbugs could not compare your location with the report pin. Move the pin and try again.'
      );
      return;
    }

    if (distancePolicy.status === 'remote_confirmation_required') {
      Alert.alert(
        'Confirm Report Location',
        `This pin is about ${roundedDistanceLabel(distanceMiles)} from your current location. Confirm that it marks the correct cleanup site.`,
        [
          {
            text: 'Move pin',
            style: 'cancel',
            onPress: () => closeUnverifiedDraft({ returnToPlacement: true }),
          },
          {
            text: 'Use this location',
            onPress: () => {
              if (!isCurrentRequest() || !navigation.isFocused()) return;
              setReportLocationVerification('verified');
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }

    // Location is valid — unlock the workflow navigation.
    setReportLocationVerification('verified');

  } catch (error) {
    console.log('Report location verification error:', error);

    if (!isCurrentRequest()) return;
    closeUnverifiedDraft();
    if (!navigation.isFocused()) return;

    Alert.alert(
      'Unable to Verify Location',
      'Litterbugs could not determine your current location. Please try again.'
    );
  }
};

const openReportLocationPicker = async (skipDraft = false) => {
  if (isCentering) return;
  if (skipDraft !== true && currentUserId) {
    try {
      const saved = await loadReportDraft(currentUserId);
      if (saved) {
        Alert.alert('Resume your report?', 'Your details and photos are saved on this device. We’ll verify the location again before you submit.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start new', style: 'destructive', onPress: async () => { await clearReportDraft(currentUserId); openReportLocationPicker(true); } },
          { text: 'Resume draft', onPress: () => beginReportAtCoordinate(saved.coordinate, saved.form) },
        ]);
        return;
      }
    } catch { Alert.alert('Draft unavailable', 'Your saved report could not be loaded. Please try again.'); return; }
  }
  setIsCentering(true);

  try {
    const reportRegion = await locateAndCenterMap({
      permissionMessage: 'Litterbugs uses your current location to place a new litter report accurately.',
      regionForPosition: reportLocationRegion,
      accuracy: Location.Accuracy.High,
    });
    const coord = mapCenterCoordinate(reportRegion);
    if (!coord) return;

    if (!isPermanentUser(currentUser)) {
      setPendingReportCoordinate(coord);
      navigation.getParent()?.navigate('Auth');
      return;
    }

    setSelectedReport(null);
    setDetailsOpen(false);
    setPlacementCoordinate(coord);
    setReportPlacementActive(true);
  } catch (error) {
    console.log('Report location start error:', error);
    Alert.alert('Location Error', error?.message || 'Unable to find your location.');
  } finally {
    setIsCentering(false);
  }
};

const cancelReportLocationPicker = () => {
  setReportPlacementActive(false);
  setPlacementCoordinate(null);
};

const confirmReportLocation = () => {
  const coord = placementCoordinate || mapCenterCoordinate(region);
  if (!coord) {
    Alert.alert('Map location unavailable', 'Move the map and try again.');
    return;
  }

  setReportPlacementActive(false);
  setPlacementCoordinate(null);
  beginReportAtCoordinate(coord);
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
  if (!isPermanentUser(currentUser)) setPendingReportCoordinate(null);
}), [currentUser, navigation, setPendingReportCoordinate]);

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
    Alert.alert('Stripe setup unavailable', 'Please try again from the Profile screen.');
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
        ({ data, error } = await supabase
          .from('reports')
          .insert(createPayload)
          .select()
          .single());
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

        Alert.alert('Save failed', error.message);
        return;
      }
  
      // Edited report replacements are handled with the report update above.
      let photoPaths = [];
      if (!isEditing && form.photos?.length > 0) {
        try {
          photoPaths = await uploadReportPhotos(
            form.photos,
            data.id,
            userId,
            setSaveStage,
          );
        } catch (photoError) {
          const { error: rollbackError } = await supabase
            .from('reports')
            .delete()
            .eq('id', data.id)
            .eq('user_id', userId);
          if (rollbackError) console.log('Empty report rollback failed:', rollbackError);
          throw photoError;
        }
      }
  
      if (photoPaths.length > 0) {
        setSaveStage('Finalizing your report…');
        const { error: photoUpdateError } = await supabase
          .from('reports')
          .update({ photo_paths: photoPaths })
          .eq('id', data.id)
          .eq('user_id', userId);

        if (photoUpdateError) {
          await supabase.storage.from('report_photos').remove(photoPaths);
          const { error: rollbackError } = await supabase
            .from('reports')
            .delete()
            .eq('id', data.id)
            .eq('user_id', userId);
          if (rollbackError) console.log('Report photo rollback failed:', rollbackError);
          throw photoUpdateError;
        }
  
        data.photo_paths = photoPaths;
        if (geminiReviewEnabled) {
          refreshReportAfterFundingReview(
            data.id,
            'Report funding photo review deferred:',
          );
        }
      }
  
      if (!isEditing) await clearReportDraft(currentUserId).catch(() => {});
      upsertReport({ ...data, reporter: data.reporter || currentProfile });
      if (isEditing) await refreshReports({ showRefresh: false });
      else refreshProfile().catch((profileError) => {
        console.log('Profile refresh deferred after report save:', profileError);
      });
  
      setDraftCoord(null);
      setFormOpen(false);
      setReportLocationVerification('idle');
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
        'Couldn’t save report',
        e?.message || 'Something went wrong saving your report.'
      );
    }
  };
  
// Final submit from Review screen
const submitReport = async () => {
  if (isSaving) return;

  if (!isEditing && reportLocationVerification === 'checking') {
    Alert.alert(
      'Still verifying location',
      'Wait a moment while Litterbugs confirms the selected report location.'
    );
    return;
  }

  if (!hasAttachedReportPhoto()) {
    Alert.alert(
      'Photo required',
      'Add at least one clear photo so volunteers can identify the cleanup site.'
    );
    jumpToReportStep(1);
    return;
  }

  if (!hasStartingFundingChoice) {
    Alert.alert(
      'Choose cleanup funding',
      'Select Volunteer or choose a starting cleanup reward.'
    );
    return;
  }

  if (wantsStartingFunding && !startingContributionCents) {
    Alert.alert(
      'Enter a valid contribution',
      'Choose at least $1 and no more than $1,000, or select Volunteer.'
    );
    return;
  }

  setIsSaving(true);
  setSaveStage('Saving report details…');

  try {
    await saveReport();
  } finally {
    setIsSaving(false);
    setSaveStage('Saving report…');
  }
};

  // Cancel Report
  const discardDraft = () => {
    if (!isEditing && currentUserId) clearReportDraft(currentUserId).catch(() => setDraftSaveError(true));
    reportLocationRequestRef.current += 1;
    setDraftCoord(null);
    setFormOpen(false);
    setReportLocationVerification('idle');
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
      || Boolean(form.startingFundingChoice)
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
          try { await saveReportDraft(currentUserId, { form, coordinate: draftCoord, step: reportStep }); setFormOpen(false); reportLocationRequestRef.current += 1; }
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
      Alert.alert('Location Error', e?.message || 'Unable to find your location.');
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

const closeReportDetails = () => {
  setDetailsOpen(false);
  setSelectedReport(null);
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
      const report = requestedMarker?.report
        ?? await getReportById(requestedReportId);

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

      openReportDetails(report);
      navigation.setParams({ reportId: undefined });
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
      const [firstPath, ...remainingPaths] = selectedReport.photo_paths;
      const firstUrl = await getReportPhotoUrl(firstPath);

      if (active && firstUrl) {
        setReportPhotoUrls([firstUrl]);
        setPhotosLoading(false);
      }

      const remainingUrls = await Promise.all(
        remainingPaths.map((path) => getReportPhotoUrl(path))
      );

      if (active) {
        setReportPhotoUrls([firstUrl, ...remainingUrls].filter(Boolean));
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
}, [getReportPhotoUrl, selectedReport?.id, JSON.stringify(selectedReport?.photo_paths)]);

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
}, [currentUserId, selectedReport?.cleanup_state, selectedReport?.id]);

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
        shareImageUri,
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
        'Direct Instagram Stories sharing isn’t available in this app version. Use More sharing options instead.'
      );
      return;
    }

    let instagramAvailable = false;
    try {
      instagramAvailable = await isInstagramStoriesAvailable({
        platform: Platform.OS,
        isPackageInstalled: installedRNShare.isPackageInstalled,
        canOpenURL: Linking.canOpenURL,
      });
    } catch (error) {
      console.log('Instagram availability check error:', error);
    }

    if (!instagramAvailable) {
      Alert.alert(
        'Instagram isn’t available',
        'Install Instagram or choose More sharing options to send the report another way.'
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
          ? 'Install Instagram or choose More sharing options to send the report another way.'
          : 'We couldn’t prepare the Instagram Story. Choose More sharing options to keep sharing.'
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
      setPendingAction({ kind: 'fund', reportId });
      setDetailsOpen(false);
      navigation.getParent()?.navigate('Auth');
      return;
    }

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
        Alert.alert('Unable to continue', error?.message || 'Please try again.');
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

const renderReportStep = () => {
  const reviewPhotos =
    form.photos.length > 0
      ? form.photos
      : isEditing
        ? reportPhotoUrls
        : [];

  switch (reportStep) {

    // =============================
    // STEP 1 — TITLE
    // =============================
    case 0:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            OPTIONAL
          </Text>

          <Text style={styles.wizardTitle}>
            Give this report a title
          </Text>

          <Text style={styles.wizardDescription}>
            Keep it short and recognizable. If you leave this blank,
            we'll use “Litter Report.”
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.wizardLargeInput,
            ]}
            placeholder="Litter Report"
            value={form.title}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                title: text,
              }))
            }
            editable={!isSaving}
            maxLength={80}
            returnKeyType="next"
            onSubmitEditing={goToNextReportStep}
          />
        </View>
      );


    // =============================
    // STEP 2 — PHOTOS
    // =============================
    case 1:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            REQUIRED
          </Text>

          <Text style={styles.wizardTitle}>
            Add photos
          </Text>

          <Text style={styles.wizardDescription}>
            Add 1–3 photos of the littered area. Include nearby landmarks
            or surroundings that will help a cleaner find the location.
          </Text>

          {isEditing
            && form.photos.length === 0
            && (selectedReport?.photo_paths?.length ?? 0) > 0 ? (
            <View style={styles.existingPhotoNotice}>
              <Ionicons
                name="images-outline"
                size={34}
                color="#2F7D32"
              />

              <Text style={styles.existingPhotoTitle}>
                Existing photos will stay attached
              </Text>

              <Text style={styles.existingPhotoText}>
                Keep these photos, or choose a new set below. Saving a new set replaces all existing report photos.
              </Text>

              {reportPhotoUrls.length > 0 && (
                <View style={styles.wizardPhotoGrid}>
                  {reportPhotoUrls.map((uri, index) => (
                    <Image
                      key={`${uri}-${index}`}
                      source={{ uri }}
                      style={styles.wizardPhotoThumb}
                    />
                  ))}
                </View>
              )}

              <View style={styles.wizardPhotoActions}>
                <TouchableOpacity
                  style={styles.wizardPhotoActionButton}
                  onPress={() => pickImage('camera')}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Take replacement report photo"
                >
                  <Ionicons name="camera-outline" size={20} color="#2F7D32" />
                  <Text style={styles.wizardPhotoActionText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.wizardPhotoActionButton}
                  onPress={() => pickImage('library')}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Choose replacement report photos"
                >
                  <Ionicons name="images-outline" size={20} color="#2F7D32" />
                  <Text style={styles.wizardPhotoActionText}>Choose photos</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {isEditing ? (
                <View style={styles.replacementPhotoNotice}>
                  <Text style={styles.existingPhotoTitle}>New photo set selected</Text>
                  <Text style={styles.existingPhotoText}>These photos will replace the existing set when you save.</Text>
                  <TouchableOpacity
                    onPress={() => setForm((prev) => ({ ...prev, photos: [] }))}
                    disabled={isSaving}
                  >
                    <Text style={styles.keepExistingPhotosText}>Keep existing photos instead</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {form.photos.length < MAX_REPORT_PHOTOS ? (
                <View style={styles.wizardPhotoActions}>
                  <TouchableOpacity
                    style={styles.wizardPhotoActionButton}
                    onPress={() => pickImage('camera')}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel="Take litter report photo"
                  >
                    <Ionicons name="camera-outline" size={20} color="#2F7D32" />
                    <Text style={styles.wizardPhotoActionText}>Take photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.wizardPhotoActionButton}
                    onPress={() => pickImage('library')}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose up to ${MAX_REPORT_PHOTOS - form.photos.length} report photos`}
                  >
                    <Ionicons name="images-outline" size={20} color="#2F7D32" />
                    <Text style={styles.wizardPhotoActionText}>Choose photos</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {form.photos.length > 0 && (
                <View style={styles.wizardPhotoGrid}>
                  {form.photos.map((uri, index) => (
                    <View
                      key={`${uri}-${index}`}
                      style={styles.wizardPhotoContainer}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.wizardPhotoThumb}
                      />

                      <TouchableOpacity
                        style={styles.deletePhotoButton}
                        onPress={() =>
                          removePhoto(index)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Remove report photo ${index + 1}`}
                      >
                        <Text style={styles.deletePhotoText}>
                          ✕
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {!hasAttachedReportPhoto() ? (
            <Text style={styles.requiredHint}>
              Add at least one photo to continue.
            </Text>
          ) : null}
        </View>
      );


    // =============================
    // STEP 3 — LITTER TYPES
    // =============================
    case 2:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            REQUIRED
          </Text>

          <Text style={styles.wizardTitle}>
            What kind of litter did you find?
          </Text>

          <Text style={styles.wizardDescription}>
            Select all that apply. You can also type something
            that isn't listed.
          </Text>

          <View style={styles.typeBox}>
            <View style={styles.typeChipRow}>
              {LITTER_OPTIONS.map(({ label, icon }) => {
                const selected =
                  form.selectedTypes?.includes(label);

                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.typeChip,
                      selected &&
                        styles.typeChipSelected,
                    ]}
                    onPress={() => {
                      setForm((prev) => {
                        const alreadySelected =
                          prev.selectedTypes?.includes(
                            label
                          );

                        return {
                          ...prev,

                          selectedTypes:
                            alreadySelected
                              ? prev.selectedTypes.filter(
                                  (type) =>
                                    type !== label
                                )
                              : [
                                  ...(prev.selectedTypes ||
                                    []),
                                  label,
                                ],
                        };
                      });
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${label} litter type`}
                  >
                    <Ionicons
                      name={icon}
                      size={17}
                      color={
                        selected ? '#fff' : '#555'
                      }
                      style={styles.typeChipIcon}
                    />

                    <Text
                      style={[
                        styles.typeChipText,
                        selected &&
                          styles.typeChipTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.wizardFieldLabel}>
            Other
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Mattress, appliances, or another type"
            value={form.types}
            onFocus={revealBottomReportField}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                types: text,
              }))
            }
          />

          {!canAdvanceFromStep(2) && (
            <Text style={styles.requiredHint}>
              Select at least one litter type to continue.
            </Text>
          )}
        </View>
      );


    // =============================
    // STEP 4 — SEVERITY
    // =============================
    case 3:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            REQUIRED
          </Text>

          <Text style={styles.wizardTitle}>
            How severe is it?
          </Text>

          <Text style={styles.wizardDescription}>
            Choose the level that best matches what you saw.
          </Text>

          <View style={styles.wizardSeverityList}>
            {[
              {
                level: 'Low',
                icon: 'leaf-outline',
              },
              {
                level: 'Medium',
                icon: 'trash-outline',
              },
              {
                level: 'High',
                icon: 'warning-outline',
              },
            ].map(({ level, icon }) => {
              const selected =
                form.severity === level;

              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.wizardSeverityOption,
                    selected &&
                      styles.wizardSeveritySelected,
                  ]}
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      severity: level,
                    }))
                  }
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${level} severity`}
                >
                  <Ionicons
                    name={icon}
                    size={27}
                    color={
                      selected
                        ? '#2F7D32'
                        : '#667085'
                    }
                  />

                  <Text
                    style={[
                      styles.wizardSeverityText,
                      selected &&
                        styles.wizardSeverityTextSelected,
                    ]}
                  >
                    {level}
                  </Text>

                  <View
                    style={[
                      styles.wizardRadio,
                      selected &&
                        styles.wizardRadioSelected,
                    ]}
                  >
                    {selected && (
                      <View
                        style={
                          styles.wizardRadioInner
                        }
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {!form.severity && (
            <Text style={styles.requiredHint}>
              Choose a severity level to continue.
            </Text>
          )}
        </View>
      );


    // =============================
    // STEP 5 — NOTES
    // =============================
    case 4:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            OPTIONAL · RECOMMENDED
          </Text>

          <Text style={styles.wizardTitle}>
            Anything else people should know?
          </Text>

          <Text style={styles.wizardDescription}>
            Add details that could help someone safely find and
            understand the site.
          </Text>

          <View style={styles.notesBox}>
            <View style={styles.notesChipRow}>
              {NOTES_OPTIONS.map(
                ({ label, icon }) => {
                  const selected =
                    form.selectedNotes?.includes(
                      label
                    );

                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.notesChip,
                        selected &&
                          styles.notesChipSelected,
                      ]}
                      onPress={() => {
                        setForm((prev) => {
                          const alreadySelected =
                            prev.selectedNotes?.includes(
                              label
                            );

                          return {
                            ...prev,

                            selectedNotes:
                              alreadySelected
                                ? prev.selectedNotes.filter(
                                    (note) =>
                                      note !== label
                                  )
                                : [
                                    ...(prev.selectedNotes ||
                                      []),
                                    label,
                                  ],
                          };
                        });
                      }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={label}
                    >
                      <Ionicons
                        name={icon}
                        size={17}
                        color={
                          selected
                            ? '#fff'
                            : '#555'
                        }
                        style={
                          styles.notesChipIcon
                        }
                      />

                      <Text
                        style={[
                          styles.notesChipText,
                          selected &&
                            styles.notesChipTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>

          <Text style={styles.wizardFieldLabel}>
            Other
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Add any extra details"
            value={form.notes}
            onFocus={revealBottomReportField}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                notes: text,
              }))
            }
            maxLength={500}
          />
        </View>
      );


    // =============================
    // STEP 6 — REVIEW & SUBMIT
    // =============================
    case 5:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            FINAL STEP
          </Text>

          <Text style={styles.wizardTitle}>
            Review your report
          </Text>

          <Text style={styles.wizardDescription}>
            Make sure everything looks right before you submit it.
          </Text>


          <View style={styles.reviewCard}>

            {/* TITLE */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Title
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(0)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.reviewValue}>
                {form.title?.trim() ||
                  'Litter Report'}
              </Text>
            </View>


            <View style={styles.reviewDivider} />


            {/* PHOTOS */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Photos
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(1)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              {reviewPhotos.length > 0 ? (
                <View style={styles.reviewPhotoRow}>
                  {reviewPhotos.map(
                    (uri, index) => (
                      <Image
                        key={`${uri}-${index}`}
                        source={{ uri }}
                        style={styles.reviewPhoto}
                      />
                    )
                  )}
                </View>
              ) : (
                <Text style={styles.reviewMuted}>
                  No photos added
                </Text>
              )}
            </View>


            <View style={styles.reviewDivider} />


            {/* LITTER TYPES */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Litter Types
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(2)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.reviewChipRow}>
                {form.selectedTypes.map(
                  (type) => (
                    <View
                      key={type}
                      style={styles.reviewTypeChip}
                    >
                      <Text
                        style={
                          styles.reviewChipText
                        }
                      >
                        {type}
                      </Text>
                    </View>
                  )
                )}

                {form.types?.trim() ? (
                  <View
                    style={styles.reviewTypeChip}
                  >
                    <Text
                      style={styles.reviewChipText}
                    >
                      {form.types.trim()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>


            <View style={styles.reviewDivider} />


            {/* SEVERITY */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Severity
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(3)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.reviewValue}>
                {form.severity}
              </Text>
            </View>


            <View style={styles.reviewDivider} />


            {/* NOTES */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Notes
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(4)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              {form.selectedNotes.length > 0 && (
                <View style={styles.reviewChipRow}>
                  {form.selectedNotes.map(
                    (note) => (
                      <View
                        key={note}
                        style={
                          styles.reviewNoteChip
                        }
                      >
                        <Text
                          style={
                            styles.reviewChipText
                          }
                        >
                          {note}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              )}

              {form.notes?.trim() ? (
                <Text style={styles.reviewNotes}>
                  {form.notes.trim()}
                </Text>
              ) : form.selectedNotes.length ===
                0 ? (
                <Text style={styles.reviewMuted}>
                  No additional notes
                </Text>
              ) : null}
            </View>

          </View>

          {fundingEnabled && !isEditing ? (
            <View style={styles.startingFundCard}>
              <View style={styles.startingFundHeading}>
                <Ionicons name="heart-outline" size={23} color="#2F7D32" />
                <View style={styles.startingFundHeadingCopy}>
                  <Text style={styles.startingFundTitle}>Start the cleanup fund</Text>
                  <Text style={styles.startingFundText}>
                    A reward is optional. You can also add one after publishing.
                  </Text>
                </View>
              </View>

              <View style={styles.startingFundChoices}>
                {[
                  { value: 'none', label: 'Volunteer' },
                  { value: '25', label: '$25' },
                  { value: 'other', label: 'Other' },
                ].map((choice) => {
                  const selected = form.startingFundingChoice === choice.value;
                  return (
                    <TouchableOpacity
                      key={choice.value}
                      style={[
                        styles.startingFundChoice,
                        selected && styles.startingFundChoiceSelected,
                      ]}
                      onPress={() => setForm((current) => ({
                        ...current,
                        startingFundingChoice: choice.value,
                      }))}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={choice.value === 'none'
                        ? 'Keep this cleanup volunteer-based'
                        : `Start cleanup fund with ${choice.label}`}
                    >
                      <Text style={[
                        styles.startingFundChoiceText,
                        selected && styles.startingFundChoiceTextSelected,
                      ]}>
                        {choice.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {form.startingFundingChoice === 'other' ? (
                <View style={styles.startingFundOtherRow}>
                  <Text style={styles.startingFundDollar}>$</Text>
                  <TextInput
                    value={form.startingFundingOther}
                    onFocus={revealBottomReportField}
                    onChangeText={(value) => setForm((current) => ({
                      ...current,
                      startingFundingOther: value,
                    }))}
                    keyboardType="decimal-pad"
                    placeholder="1.00"
                    maxLength={7}
                    style={styles.startingFundOtherInput}
                    editable={!isSaving}
                    accessibilityLabel="Starting cleanup fund amount"
                  />
                </View>
              ) : null}

              {wantsStartingFunding ? (
                startingContributionCents ? (
                  <Text style={styles.startingFundTotal}>
                    Contribution {formatUsd(startingContributionCents)} · Litterbugs fee {formatUsd(calculatePlatformFee(startingContributionCents))} · Total {formatUsd(startingContributionCents + calculatePlatformFee(startingContributionCents))}
                  </Text>
                ) : (
                  <Text style={styles.requiredHint}>Enter an amount from $1 to $1,000.</Text>
                )
              ) : !hasStartingFundingChoice ? (
                <Text style={styles.requiredHint}>Choose Volunteer or select a starting amount.</Text>
              ) : (
                <Text style={styles.startingFundHelper}>You can add funds from the report later.</Text>
              )}
            </View>
          ) : null}


          <TouchableOpacity
            style={[
              styles.wizardSubmitButton,
              isSaving && styles.wizardDisabled,
            ]}
            onPress={submitReport}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Submit litter report"
            accessibilityState={{ disabled: isSaving, busy: isSaving }}
          >
            {isSaving ? (
              <LoadingButtonContent label="Creating report…" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={23}
                  color="#fff"
                />

                <Text
                  style={
                    styles.wizardSubmitText
                  }
                >
                  Submit Report
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );

    default:
      return null;
  }
};





  // Map View . . .
  return (
    <View style={styles.container}>
        <MapView
          ref={mapViewRef}
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
          mapType={mapType}
        >

        {polygonParts(searchPlace?.geometry).map(([outer, ...holes], index) => <Polygon key={`${searchPlace.id}:${index}`}
          coordinates={outer.map(([longitude, latitude]) => ({ latitude, longitude }))}
          holes={holes.map(ring => ring.map(([longitude, latitude]) => ({ latitude, longitude })))}
          strokeColor="#2F7D32" accessible={false} importantForAccessibility="no" strokeWidth={1.5} fillColor="rgba(47,125,50,0.035)" tappable={false} />)}
        {mapLabels.map((m) => {
          const selected = m.id === previewId;
          const tone = cleanupMapTone(m.report);
          const icon = tone === 'completed' ? 'checkmark' : tone === 'active' ? 'time-outline' : 'leaf-outline';
          return <Marker key={m.id} coordinate={m.coordinate}
            identifier={`report:${tone}:${m.id}`}
            tracksViewChanges={tracksReportMarkers}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={selected ? 1000 : m.labelled ? 10 : 1}
            accessibilityLabel={`${m.label || 'Volunteer cleanup'}, ${tone}: ${m.report?.title || 'Litter report'}`}
            onPress={(event) => {
              event?.stopPropagation?.();
              if (reportPlacementActive) return;
              const nearby = reportsNearMapTap(mapLabels, m.id);
              if (nearby.length > 1) { setPreviewId(null); setNearbyIds(nearby.map((item) => item.id)); }
              else chooseMapReport(m.report);
            }}>
            <View style={[styles.compactMarkerHit, { width: Math.max(44, m.labelled ? m.width : 44), height: Math.max(44, m.labelled ? m.height : 44) }]}>
              {m.labelled || selected ? <View style={[styles.compactMarker, selected && styles.compactMarkerSelected, { minHeight: m.height || 32, width: m.width || 48 }]}>
                {m.label && tone === 'available' ? <Text numberOfLines={1} style={[styles.compactMarkerText, selected && { color: '#FFFFFF' }]}>{m.label}</Text>
                  : <Ionicons name={icon} size={18} color={selected ? '#FFFFFF' : '#285D38'} />}
              </View> : <View style={styles.compactMarkerDot} />}
            </View>
          </Marker>;
        })}

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
            <Text style={styles.floatingMapInstructionHint}>Move the map beneath the pin</Text>
          </Animated.View>
        </View>
      ) : null}

      {reportPlacementActive ? (
        <View
          style={styles.reportPlacementPinArea}
          pointerEvents="none"
          accessible={false}
        >
          <Ionicons name="location-sharp" size={54} color="#2F7D32" />
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
            style={styles.reportLitterButton}
            onPress={reportPlacementActive ? confirmReportLocation : openReportLocationPicker}
            disabled={showInitialMapLoading || formOpen || detailsOpen || isSaving || isCentering}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={reportPlacementActive ? 'Use this location' : 'Report litter'}
            accessibilityHint={reportPlacementActive
              ? 'Uses the location beneath the red pin for this report'
              : 'Centers on your location, then lets you confirm the cleanup site'}
            accessibilityState={{
              busy: isCentering,
              disabled: showInitialMapLoading || formOpen || detailsOpen || isSaving || isCentering,
            }}
          >
            {isCentering ? (
              <View style={styles.reportLitterButtonContent}>
                <ActivityIndicator size="small" color="#2F7D32" />
                <Text style={styles.reportLitterButtonText}>Finding you…</Text>
              </View>
            ) : (
              <View style={styles.reportLitterButtonContentFrame}>
                <Animated.View
                  style={[
                    styles.reportLitterButtonContent,
                    {
                      opacity: reportControlTransition.interpolate({
                        inputRange: [0, 0.42],
                        outputRange: [1, 0],
                        extrapolate: 'clamp',
                      }),
                      transform: [{ translateY: reportControlTransition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -5],
                      }) }],
                    },
                  ]}
                >
                  <Ionicons name="add-circle-outline" size={23} color="#2F7D32" />
                  <Text style={styles.reportLitterButtonText}>Report Litter</Text>
                </Animated.View>
                <Animated.View
                  style={[
                    styles.reportLitterButtonContent,
                    styles.reportLitterButtonContentOverlay,
                    {
                      opacity: reportControlTransition.interpolate({
                        inputRange: [0.58, 1],
                        outputRange: [0, 1],
                        extrapolate: 'clamp',
                      }),
                      transform: [{ translateY: reportControlTransition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [5, 0],
                      }) }],
                    },
                  ]}
                >
                  <Ionicons name="location-outline" size={23} color="#2F7D32" />
                  <Text style={styles.reportLitterButtonText}>Use This Location</Text>
                </Animated.View>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Center Me Button */}
      <TouchableOpacity
        style={[
          styles.centerButton,
          {
            bottom: mapControlsBottom + (previewReport && !reportPlacementActive ? previewHeight : 0) +
              (BOTTOM_NAV_METRICS.mapControlSize +
                BOTTOM_NAV_METRICS.mapControlGap) * 2,
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
          <Ionicons name="navigate-outline" size={32} color="#4F5C63" />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.mapTypeButton,
          {
            bottom: mapControlsBottom + (previewReport && !reportPlacementActive ? previewHeight : 0) +
              BOTTOM_NAV_METRICS.mapControlSize +
              BOTTOM_NAV_METRICS.mapControlGap,
          },
        ]}
        onPress={toggleMapType}
        accessibilityRole="button"
        accessibilityLabel="Change map style"
        accessibilityValue={{ text: mapType }}
      >
        <Ionicons name="layers-outline" size={32} color={getMapTypeColor()} />
      </TouchableOpacity>

{!reportPlacementActive && !detailsOpen && !showInitialMapLoading ? <MapReportPreview
        report={previewReport} nearby={nearbyReports} bottom={mapControlsBottom}
        insetBottom={insets.bottom} getPhotoUrl={getReportPhotoUrl}
        onHeight={setPreviewHeight}
        distance={reportDistanceMiles(mapUserLocation, previewReport)}
        onClose={() => setPreviewId(null)} onCloseNearby={() => setNearbyIds([])}
        onChoose={chooseMapReport} onDetails={openReportDetails}
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

        {(isSaving || photoPreparationStatus) && (
          <View
            style={styles.savingOverlay}
            pointerEvents="auto"
            accessibilityRole="progressbar"
            accessibilityLabel={photoPreparationStatus || saveStage}
          >
            <View style={styles.savingCard}>
              <ActivityIndicator size="large" color="#2F7D32" />
              <Text style={styles.savingTitle}>
                {photoPreparationStatus ? 'Getting your photos ready' : 'Creating your report'}
              </Text>
              <Text style={styles.savingStatus}>{photoPreparationStatus || saveStage}</Text>
              <Text style={styles.savingHelper}>
                {photoPreparationStatus
                  ? 'Large photos may take a few moments to prepare.'
                  : 'Keep Litterbugs open while the photos are checked for safety.'}
              </Text>
            </View>
          </View>
        )}


        {!isEditing && draftSaveError ? <Text style={{ color: '#B42318', paddingHorizontal: 20 }}>Draft could not be saved. Keep this screen open and try Save for later again.</Text> : null}
        {/* Persistent Header */}
        <View style={styles.wizardHeader}>

          <View style={{ flex: 1 }}>
            <Text style={styles.wizardHeaderTitle}>
              {isEditing
                ? 'Edit Litter Report'
                : 'New Litter Report'}
            </Text>

            <Text style={styles.wizardHeaderStep}>
              {reportLocationVerification === 'checking' && !isEditing
                ? `Step ${reportStep + 1} of ${REPORT_STEPS.length} · Verifying location…`
                : `Step ${reportStep + 1} of ${REPORT_STEPS.length} · ${REPORT_STEPS[reportStep]}`}
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
            ref={reportWizardScrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.wizardScrollContent,
              reportKeyboardVisible && styles.wizardScrollContentKeyboard,
            ]}
          >
            <TouchableWithoutFeedback
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <View style={styles.wizardDismissArea}>
                {renderReportStep()}
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


          {/* RIGHT */}
          <TouchableOpacity
            style={styles.wizardArrowButton}
            onPress={goToNextReportStep}
            disabled={
              reportStep ===
                REPORT_STEPS.length - 1 ||
              (reportLocationVerification === 'checking' && !isEditing) ||
              !canAdvanceFromStep(
                reportStep
              ) ||
              isTransitioning ||
              isSaving
            }
            accessibilityRole="button"
            accessibilityLabel="Next report step"
          >
            <Ionicons
              name="arrow-forward-circle"
              size={39}
              color={
                reportStep ===
                  REPORT_STEPS.length - 1 ||
                (reportLocationVerification === 'checking' && !isEditing) ||
                !canAdvanceFromStep(
                  reportStep
                ) ||
                isTransitioning ||
                isSaving
                  ? '#D1D5DB'
                  : '#2F7D32'
              }
            />
          </TouchableOpacity>

          </View>
        )}
      </View>
    </View>
  </View>
</Modal>

{/* ============================= */}
{/* Redesigned Report Detail View */}
{/* ============================= */}

<Modal
  visible={detailsOpen}
  animationType="slide"
  transparent
  onRequestClose={() => {
    if (reportShareSheetOpen && !reportShareBusyAction) {
      setReportShareSheetOpen(false);
      return;
    }
    if (!reportShareBusyAction) closeReportDetails();
  }}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.reportSheet}>

      {selectedReport && Number.isFinite(selectedReport.latitude) && Number.isFinite(selectedReport.longitude) ? <TouchableOpacity
        accessibilityRole="button" accessibilityLabel="Show report on map"
        style={{ position: 'absolute', zIndex: 20, top: insets.top + 12, left: 24, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#FFFFFF', flexDirection: 'row', gap: 6, alignItems: 'center' }}
        onPress={() => {
          const report = selectedReport;
          setDetailsOpen(false); setSelectedReport(null); setPreviewId(report.id);
          navigation.setParams({ reportId: undefined, returnTo: undefined });
          commitMapRegion({ ...region, latitude: report.latitude, longitude: report.longitude });
        }}><Ionicons name="map-outline" size={18} color="#285D38" /><Text style={{ color: '#285D38', fontWeight: '600' }}>Show on map</Text></TouchableOpacity> : null}

      <TouchableOpacity onPress={closeReportDetails} accessibilityRole="button" accessibilityLabel="Close report" style={{ position: 'absolute', zIndex: 20, top: insets.top + 12, right: 24, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={22} color="#30363B" /></TouchableOpacity>

      {reportDetailsPreparing ? (
        <View
          style={styles.reportDetailsLoadingOverlay}
          accessibilityRole="progressbar"
          accessibilityLabel="Loading report"
          accessibilityLiveRegion="polite"
        >
          <TouchableOpacity
            style={styles.reportDetailsLoadingClose}
            onPress={closeReportDetails}
            accessibilityRole="button"
            accessibilityLabel="Close report"
          >
            <Ionicons name="close-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <ActivityIndicator size="large" color="#2F7D32" />
          <Text style={styles.reportDetailsLoadingText}>
            {selectedReport?.cleanup_state === 'completed'
              ? 'Loading completed report…'
              : 'Loading report…'}
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={[
          styles.reportPostScrollContent,
          selectedReportHasUtilityActions && styles.reportPostScrollContentWithActions,
        ]}
      >

        {selectedReport?.cleanup_state === 'completed' ? (
          <>
            <CompletedCleanupStory
              impact={completedCleanupImpact}
              loading={completedCleanupImpactLoading}
              error={completedCleanupImpactError}
              photoWidth={reportHeroWidth}
              onRetry={() => {
                setCompletedCleanupImpact(null);
                setCompletedCleanupImpactError(null);
                setCompletedCleanupImpactLoading(true);
                setCompletedCleanupImpactReloadKey((current) => current + 1);
              }}
              onCleanerPress={completedCleanupImpact?.cleaner?.id ? () => {
                setDetailsOpen(false);
                if (completedCleanupImpact.cleaner.id === currentUserId) {
                  navigation.navigate('Profile');
                } else {
                  navigation.getParent()?.navigate('PublicProfile', {
                    profileId: completedCleanupImpact.cleaner.id,
                    sourceReportId: selectedReport.id,
                  });
                }
              } : undefined}
            />

            <View style={styles.originalReportDivider}>
              <Text style={styles.originalReportEyebrow}>BEFORE THE CLEANUP</Text>
              <Text style={styles.originalReportTitle}>Original litter report</Text>
              <Text style={styles.originalReportText}>
                See what was reported at this location before the volunteer cleanup.
              </Text>
            </View>
          </>
        ) : null}

        <ReportPhotoGallery report={selectedReport} urls={reportPhotoUrls} loading={photosLoading} width={reportHeroWidth} />

        {/* ============================= */}
        {/* Report Header                 */}
        {/* ============================= */}

        <View style={styles.reportPostHeader}>



          <Text style={styles.reportPostTitle}>
            {selectedReport?.title || 'Litter Report'}
          </Text>

          <View style={styles.rewardBadge}>
            <Ionicons
              name={Number(selectedReport?.funded_amount_cents) > 0 ? 'cash-outline' : 'heart-outline'}
              size={18}
              color="#245F2A"
            />
            <Text style={styles.rewardBadgeText}>
              {Number(selectedReport?.funded_amount_cents) > 0
                ? `${formatUsd(selectedReport.funded_amount_cents)} Cleanup Reward`
                : 'Volunteer Opportunity'}
            </Text>
          </View>

          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Get directions to this cleanup" onPress={() => Linking.openURL(`https://maps.apple.com/?daddr=${selectedReport.latitude},${selectedReport.longitude}`).catch(() => Alert.alert('Directions unavailable', 'Please try again.'))} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#2F7D32', fontWeight: '700' }}>Get directions ↗</Text></TouchableOpacity>
          {geminiReviewEnabled
            && userOwnsSelectedReport
            && selectedReport?.cleanup_state === 'available'
            && selectedReport?.renewal_status === 'active'
            && selectedReport?.funding_eligibility !== 'eligible' ? (
            <View style={styles.fundingFeedbackCard}>
              <Ionicons
                name={selectedReport?.funding_eligibility === 'better_photos'
                  ? 'camera-outline'
                  : selectedReport?.funding_eligibility === 'ineligible'
                    ? 'alert-circle-outline'
                    : 'time-outline'}
                size={23}
                color="#8A5A14"
              />
              <View style={styles.fundingCopy}>
                <Text style={styles.fundingFeedbackTitle}>
                  {selectedReport?.funding_eligibility === 'better_photos'
                    ? 'Better photos needed for funding'
                    : selectedReport?.funding_eligibility === 'safety_hold'
                      ? 'Funding review needs attention'
                      : selectedReport?.funding_eligibility === 'ineligible'
                        ? 'Funding unavailable'
                        : 'Checking funding eligibility'}
                </Text>
                <Text style={styles.fundingFeedbackText}>
                  {reportFundingFeedback?.user_summary
                    || selectedReport?.funding_hold_reason
                    || (selectedReport?.funding_eligibility === 'better_photos'
                      ? 'Edit this report to replace its original photos.'
                      : 'Report saved. Volunteers can still help while this check finishes. Return to this report to see the latest review status.')}
                </Text>
              </View>
            </View>
          ) : null}

          <ReporterIdentity
            profile={selectedReport?.reporter}
            onPress={selectedReport?.reporter?.id ? () => {
              setDetailsOpen(false);
              if (selectedReport.reporter.id === currentUserId) {
                navigation.navigate('Profile');
              } else {
                navigation.getParent()?.navigate('PublicProfile', {
                  profileId: selectedReport.reporter.id,
                  sourceReportId: selectedReport.id,
                });
              }
            } : undefined}
          />

          {/* Report dates */}
          <View style={styles.reportMetaStack}>

            {selectedReport?.created_at && (
              <View style={styles.reportMetaItem}>
                <Ionicons
                  name="time-outline"
                  size={17}
                  color="#667085"
                />

                <View>
                  <Text style={styles.reportMetaItemLabel}>
                    Reported
                  </Text>

                  <Text style={styles.reportMetaItemText}>
                    {formatFriendlyDateTime(selectedReport.created_at)}
                  </Text>
                </View>
              </View>
            )}

            {selectedReport?.expires_at && selectedReport?.cleanup_state !== 'completed' && (
              <View style={styles.reportMetaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color="#667085"
                />

                <View>
                  <Text style={styles.reportMetaItemLabel}>
                    Expires
                  </Text>

                  <Text style={styles.reportMetaItemText}>
                    {new Date(
                      selectedReport.expires_at
                    ).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}

            {selectedReport?.latitude != null
              && selectedReport?.longitude != null
              && Number.isFinite(Number(selectedReport.latitude))
              && Number.isFinite(Number(selectedReport?.longitude)) ? (
              <View style={styles.reportMetaItem}>
                <Ionicons
                  name="location-outline"
                  size={17}
                  color="#667085"
                />

                <View>
                  <Text style={styles.reportMetaItemLabel}>
                    Location
                  </Text>

                  <Text style={styles.reportMetaItemText}>
                    {Number(selectedReport.latitude).toFixed(4)}, {Number(selectedReport.longitude).toFixed(4)}
                  </Text>
                </View>
              </View>
            ) : null}

          </View>


          {/* Severity */}
          {selectedReport?.severity && (
            <View
              style={[
                styles.reportSeverityPill,

                selectedReport.severity === 'Low' &&
                  styles.severityLow,

                selectedReport.severity === 'Medium' &&
                  styles.severityMedium,

                selectedReport.severity === 'High' &&
                  styles.severityHigh,
              ]}
            >
              <Ionicons
                name={
                  selectedReport.severity === 'High'
                    ? 'warning-outline'
                    : selectedReport.severity === 'Low'
                      ? 'leaf-outline'
                      : 'trash-outline'
                }
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.reportSeverityText}>
                {selectedReport.severity} Severity
              </Text>
            </View>
          )}

        </View>


        {/* ============================= */}
        {/* Main Report Information       */}
        {/* ============================= */}

        <View style={styles.reportPostBody}>


          {/* Litter Types */}
          {(
            selectedReport?.litter_types?.length > 0 ||
            selectedReport?.types
          ) && (

            <View style={styles.reportPostSection}>

              <View style={styles.reportSectionHeader}>

                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#2F7D32"
                />

                <Text style={styles.reportPostSectionTitle}>
                  Litter Types
                </Text>

              </View>


              <View style={styles.reportChipRow}>

                {selectedReport?.litter_types?.map((type) => (

                  <View
                    key={type}
                    style={[
                      styles.reportChip,
                      styles.reportTypeChip,
                    ]}
                  >
                    <Text style={styles.reportChipText}>
                      {type}
                    </Text>
                  </View>

                ))}


                {/* User-entered "Other" litter type */}
                {selectedReport?.types && (

                  <View
                    style={[
                      styles.reportChip,
                      styles.reportOtherTypeChip,
                    ]}
                  >
                    <Text style={styles.reportOtherTypeText}>
                      {selectedReport.types}
                    </Text>
                  </View>

                )}

              </View>

            </View>
          )}


          {/* Notes */}
          {selectedReport?.notes_presets?.length > 0 && (

            <View style={styles.reportPostSection}>

              <View style={styles.reportSectionHeader}>

                <Ionicons
                  name="information-circle-outline"
                  size={21}
                  color="#1E88E5"
                />

                <Text style={styles.reportPostSectionTitle}>
                  Notes
                </Text>

              </View>


              <View style={styles.reportChipRow}>

                {selectedReport.notes_presets.map((note) => (

                  <View
                    key={note}
                    style={[
                      styles.reportChip,
                      styles.reportNoteChip,
                    ]}
                  >
                    <Text style={styles.reportChipText}>
                      {note}
                    </Text>
                  </View>

                ))}

              </View>

            </View>
          )}


          {/* Additional descriptive information */}
          {selectedReport?.notes_other && (

            <View style={styles.reportPostSection}>

              <View style={styles.reportSectionHeader}>

                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#667085"
                />

                <Text style={styles.reportPostSectionTitle}>
                  Additional Details
                </Text>

              </View>

              <View style={styles.reportDetailsCard}>

                <Text style={styles.reportDetailsText}>
                  {selectedReport.notes_other}
                </Text>

              </View>

            </View>
          )}


          {cleanupDiscoverable ? (
            <View style={styles.cleanupEligibilityCard}>
              <View style={styles.cleanupEligibilityHeader}>
                <View style={styles.cleanupEligibilityIcon}>
                  <Ionicons name="leaf-outline" size={24} color="#2F7D32" />
                </View>
                <View style={styles.cleanupEligibilityCopy}>
                  <Text style={styles.cleanupEligibilityTitle}>Ready to clean this up?</Text>
                  <Text style={styles.cleanupEligibilityText}>
                    Claim this report for 24 hours. Review and accept the current safety acknowledgment before every claim.
                  </Text>
                </View>
              </View>


            </View>
          ) : null}

          {cleanupStatus && selectedReport?.cleanup_state !== 'completed' && (
            <View
              style={[
                styles.cleanupProgressCard,
                cleanupStatus.tone === 'completed' && styles.cleanupCompleteStatusCard,
              ]}
            >
              <View style={styles.cleanupProgressHeader}>
                <View
                  style={[
                    styles.cleanupProgressIcon,
                    cleanupStatus.tone === 'completed' && styles.cleanupCompleteStatusIcon,
                  ]}
                >
                  <Ionicons
                    name={cleanupStatus.icon}
                    size={24}
                    color={cleanupStatus.tone === 'completed' ? '#2F7D32' : '#8A6400'}
                  />
                </View>
                <View style={styles.cleanupProgressCopy}>
                  <Text
                    style={[
                      styles.cleanupProgressTitle,
                      cleanupStatus.tone === 'completed' && styles.cleanupCompleteStatusTitle,
                    ]}
                  >
                    {cleanupStatus.title}
                  </Text>
                  <Text
                    style={[
                      styles.cleanupProgressText,
                      cleanupStatus.tone === 'completed' && styles.cleanupCompleteStatusText,
                    ]}
                  >
                    {selectedReport?.cleanup_state === 'claimed'
                      && currentUserIsCleaner
                      && selectedCleanupAttempt?.claim_expires_at
                      ? `Complete by ${new Date(selectedCleanupAttempt.claim_expires_at).toLocaleString()}.`
                      : cleanupStatus.description}
                  </Text>
                </View>
              </View>

              {selectedReport?.cleanup_state === 'claimed' && cleanupAttemptLoading ? (
                <View style={styles.cleanupProgressLoading}>
                  <ActivityIndicator color="#8A6400" />
                  <Text style={styles.cleanupProgressLoadingText}>Checking cleanup details…</Text>
                </View>
              ) : cleanupStatus.showClaimActions ? (
                <View style={styles.cleanupActionStack}>
                  <TouchableOpacity
                    style={[styles.cleanupActionButton, styles.cleanupNavigateButton]}
                    onPress={openCleanupNavigation}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Navigate to Cleanup"
                  >
                    <Ionicons name="navigate-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.cleanupPrimaryActionText}>Navigate to Cleanup</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cleanupActionButton, styles.cleanupCompleteButton]}
                    onPress={openCleanupSubmission}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Complete Cleanup"
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#2F7D32" />
                    <Text style={styles.cleanupSecondaryActionText}>Complete Cleanup</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cleanupActionButton, styles.cleanupReleaseButton]}
                    onPress={confirmCleanupRelease}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Release Cleanup"
                  >
                    {cleanupActionBusy ? (
                      <LoadingButtonContent label="Releasing…" color="#A33A32" />
                    ) : (
                      <>
                        <Ionicons name="return-down-back-outline" size={20} color="#A33A32" />
                        <Text style={styles.cleanupReleaseActionText}>Release Cleanup</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : cleanupStatus.showSubmissionAction ? (
                <View style={styles.cleanupActionStack}>
                  <TouchableOpacity
                    style={[styles.cleanupActionButton, styles.cleanupFeedbackButton]}
                    onPress={openCleanupFeedback}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Review Cleanup Feedback"
                  >
                    <Ionicons name="document-text-outline" size={20} color="#755900" />
                    <Text style={styles.cleanupFeedbackActionText}>Review Feedback</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cleanupActionButton, styles.cleanupCompleteButton]}
                    onPress={openCleanupSubmission}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Update Submission"
                  >
                    <Ionicons name="camera-outline" size={20} color="#2F7D32" />
                    <Text style={styles.cleanupSecondaryActionText}>Update Submission</Text>
                  </TouchableOpacity>
                </View>
              ) : cleanupStatus.showReviewAction ? (
                <View style={styles.cleanupActionStack}>
                  <TouchableOpacity
                    style={[styles.cleanupActionButton, styles.cleanupCompleteButton]}
                    onPress={openCleanupReview}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Review Cleanup"
                  >
                    <Ionicons name="images-outline" size={20} color="#2F7D32" />
                    <Text style={styles.cleanupSecondaryActionText}>Review Cleanup</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          {userOwnsSelectedReport && (
            selectedReport?.funding_locked_at || !canEditOrDeleteSelectedReport
          ) ? (
            <View style={styles.ownerReportLockCard}>
              <Ionicons name="lock-closed-outline" size={20} color="#5F6E62" />
              <View style={styles.ownerReportLockCopy}>
                <Text style={styles.ownerReportLockTitle}>Report history is locked</Text>
                <Text style={styles.ownerReportLockText}>
                  {selectedReport?.funding_locked_at
                    || !['available', 'expired', 'cancelled'].includes(selectedReport?.cleanup_state)
                    ? 'Funding or cleanup activity has started, so this report can no longer be edited or deleted.'
                    : 'Expired and cancelled reports stay in your history and can no longer be edited or deleted.'}
                </Text>
              </View>
            </View>
          ) : null}

        </View>

      </ScrollView>

      {cleanupDiscoverable ? <TouchableOpacity style={[styles.cleanupButton, { marginHorizontal: 18, marginTop: 8, backgroundColor: '#2F7D32' }]} onPress={beginCleanupClaim} disabled={cleanupActionBusy} accessibilityRole="button">{cleanupActionBusy ? <LoadingButtonContent label="Opening claim…" /> : <Text style={[styles.cleanupButtonText, { color: '#FFFFFF' }]}>Help clean this up</Text>}</TouchableOpacity> : null}
      {selectedReportHasUtilityActions ? (
        <View style={[styles.reportUtilityBar, { paddingBottom: canEditOrDeleteSelectedReport ? 12 : Math.max(insets.bottom, 12) }]}>
          {selectedReportCanOpenFunding ? (
            <TouchableOpacity
              style={[styles.reportUtilityButton, styles.reportFundButton]}
              onPress={() => openFundingContribution({ reportId: selectedReport.id })}
              disabled={payoutGateBusy}
              accessibilityRole="button"
              accessibilityLabel="Fund cleanup"
            >
              {payoutGateBusy ? (
                <LoadingButtonContent label="Checking Stripe…" color="#2F7D32" />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={20} color="#2F7D32" />
                  <Text style={styles.reportFundButtonText}>Fund</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {selectedReportIsShareable ? (
            <TouchableOpacity
              style={[styles.reportUtilityButton, styles.reportShareButton]}
              onPress={() => setReportShareSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={selectedReport?.cleanup_state === 'completed'
                ? 'Share completed cleanup'
                : 'Share litter report'}
            >
              <Ionicons name="share-social-outline" size={20} color="#4F5C63" />
              <Text style={styles.reportShareButtonText}>
                {reportShareActionLabel(selectedReport)}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}


      {/* ============================= */}
      {/* Persistent Footer             */}
      {/* ============================= */}

      {canEditOrDeleteSelectedReport ? <View style={styles.reportFooter}>


        {/* DELETE — signed-in owner only */}
        {canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at && (

          <TouchableOpacity
            style={[
              styles.reportFooterButton,
              styles.reportDeleteButton,
            ]}
            onPress={() => {

              Alert.alert(
                'Delete report?',
                'This removes the report from the map and report lists. It cannot be undone.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Delete',
                    style: 'destructive',

                    onPress: async () => {

                      try {
                        await withdrawOwnReport(selectedReport.id);
                        removeReport(selectedReport.id);
                        setDetailsOpen(false);
                        setSelectedReport(null);
                        Alert.alert(
                          'Report deleted',
                          'The report is no longer visible on the map or in report lists.'
                        );
                      } catch (error) {
                        Alert.alert(
                          'Couldn’t delete report',
                          reportWithdrawalErrorMessage(error)
                        );
                      }
                    },
                  },
                ]
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete report"
          >

            <Ionicons
              name="trash-outline"
              size={19}
              color="#C94747"
            />

            <Text style={styles.reportDeleteButtonText}>
              Delete
            </Text>

          </TouchableOpacity>
        )}


        {/* EDIT — signed-in owner only */}
        {canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at && (

          <TouchableOpacity
            style={[
              styles.reportFooterButton,
              styles.reportEditButton,
            ]}
            onPress={() => {

              setForm({
                title:
                  selectedReport.title || '',

                selectedTypes:
                  selectedReport.litter_types || [],

                types:
                  selectedReport.types || '',

                // Empty means keep the current photos unless replacements are chosen.
                photos: [],

                severity:
                  selectedReport.severity || '',

                selectedNotes:
                  selectedReport.notes_presets || [],

                notes:
                  selectedReport.notes_other || '',

                startingFundingChoice: 'none',

                startingFundingOther: '',
              });


              setEditingReportId(
                selectedReport.id
              );

              setIsEditing(true);
              setReportLocationVerification('idle');


              // Keep original report location
              setDraftCoord({
                latitude:
                  selectedReport.latitude,

                longitude:
                  selectedReport.longitude,
              });


              resetReportWizard();

              setDetailsOpen(false);
              setFormOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit report"
          >

            <Ionicons
              name="create-outline"
              size={19}
              color="#2F7D32"
            />

            <Text style={styles.reportEditButtonText}>
              Edit
            </Text>

          </TouchableOpacity>
        )}



      </View> : null}

    </View>

    <ReportShareSheet
      visible={reportShareSheetOpen && detailsOpen && selectedReportIsShareable}
      report={selectedReport}
      previewPhotoUrl={reportPhotoUrls[0] ?? null}
      busyAction={reportShareBusyAction}
      onSystemShare={shareSelectedReport}
      onClose={() => {
        if (!reportShareBusyAction) setReportShareSheetOpen(false);
      }}
    />
  </View>
</Modal>

<CleanupWaiverModal
  visible={cleanupWaiverOpen}
  waiver={cleanupWaiver}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  initialMapLoading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
  },
  floatingMapHeaderArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 12,
    minHeight: 56,
  },
  floatingMapHeaderCard: {
    position: 'absolute',
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(47,125,50,0.16)',
    borderRadius: 25,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(31, 35, 40, 0.16)',
  },
  floatingMapLogoCard: {
    width: 154,
  },
  floatingMapLogo: {
    width: 112,
    height: 34,
  },
  floatingMapInstructionCard: {
    alignSelf: 'center',
    width: 282,
    minHeight: 54,
    paddingHorizontal: 18,
  },
  floatingMapInstructionTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  floatingMapInstructionHint: {
    marginTop: 1,
    color: '#667085',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  reportLitterButtonDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    paddingRight: 20,
    alignItems: 'flex-end',
  },
  reportLitterButton: {
    height: 56,
    width: 194,
    paddingHorizontal: 18,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(47,125,50,0.35)',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  reportLitterButtonContentFrame: {
    width: '100%',
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportLitterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reportLitterButtonContentOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  reportLitterButtonText: {
    color: '#2F7D32',
    fontSize: 16,
    fontWeight: '800',
  },
  reportPlacementCloseWrap: {
    position: 'absolute',
    right: 224,
    top: 0,
    zIndex: 2,
  },
  reportPlacementClose: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.24)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  reportPlacementPinArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ============================= */
/* Multi-step Report Form        */
/* ============================= */

wizardKeyboardView: {
  flex: 1,
  justifyContent: 'flex-end',
},

wizardSheet: {
  height: '92%',
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  overflow: 'hidden',
},

wizardHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 22,
  paddingTop: 22,
  paddingBottom: 15,
},

wizardHeaderTitle: {
  fontSize: 22,
  fontWeight: '800',
  color: '#1F2937',
},

wizardHeaderStep: {
  marginTop: 3,
  fontSize: 13,
  fontWeight: '600',
  color: '#6B7280',
},

wizardCloseButton: {
  width: 42,
  height: 42,
  borderRadius: 21,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F3F4F6',
},

wizardDivider: {
  height: 1,
  backgroundColor: 'rgba(0,0,0,0.08)',
},

wizardPage: {
  flex: 1,
},

wizardScrollContent: {
  flexGrow: 1,
  paddingHorizontal: 24,
  paddingTop: 34,
  paddingBottom: 34,
},

wizardScrollContentKeyboard: {
  paddingBottom: 140,
},

wizardDismissArea: {
  flexGrow: 1,
},

wizardStep: {
  flexGrow: 1,
},

wizardEyebrow: {
  fontSize: 12,
  fontWeight: '800',
  letterSpacing: 0.8,
  color: '#2F7D32',
  marginBottom: 10,
},

wizardTitle: {
  fontSize: 28,
  lineHeight: 34,
  fontWeight: '800',
  color: '#1F2937',
  marginBottom: 10,
},

wizardDescription: {
  fontSize: 16,
  lineHeight: 23,
  color: '#667085',
  marginBottom: 28,
},

wizardLargeInput: {
  minHeight: 58,
  fontSize: 17,
},

wizardFieldLabel: {
  fontSize: 14,
  fontWeight: '700',
  color: '#4B5563',
  marginTop: 18,
  marginBottom: 7,
},

requiredHint: {
  marginTop: 12,
  fontSize: 13,
  fontWeight: '600',
  color: '#B45309',
},

wizardDisabled: {
  opacity: 0.55,
},


/* Photos */

wizardPhotoActions: {
  width: '100%',
  flexDirection: 'row',
  gap: 10,
},

wizardPhotoActionButton: {
  flex: 1,
  minHeight: 48,
  paddingHorizontal: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  borderWidth: 1,
  borderColor: '#8FBC92',
  borderRadius: 13,
  backgroundColor: '#F6FBF6',
},

wizardPhotoActionText: {
  color: '#2F7D32',
  fontSize: 14,
  fontWeight: '800',
},

wizardPhotoGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 20,
},

wizardPhotoContainer: {
  position: 'relative',
},

wizardPhotoThumb: {
  width: 96,
  height: 96,
  borderRadius: 14,
  backgroundColor: '#E5E7EB',
},

existingPhotoNotice: {
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#C8E6C9',
  backgroundColor: '#F1F8E9',
  padding: 22,
  alignItems: 'center',
},

existingPhotoTitle: {
  marginTop: 10,
  fontSize: 17,
  fontWeight: '800',
  color: '#2F7D32',
  textAlign: 'center',
},

existingPhotoText: {
  marginTop: 6,
  fontSize: 14,
  lineHeight: 20,
  color: '#667085',
  textAlign: 'center',
},

replacementPhotoNotice: {
  marginBottom: 14,
  padding: 16,
  borderWidth: 1,
  borderColor: '#C8E6C9',
  borderRadius: 16,
  backgroundColor: '#F1F8E9',
},

keepExistingPhotosText: {
  marginTop: 12,
  color: '#2F7D32',
  fontSize: 14,
  fontWeight: '800',
  textAlign: 'center',
},


/* Severity */

wizardSeverityList: {
  gap: 14,
},

wizardSeverityOption: {
  minHeight: 74,
  borderRadius: 18,
  borderWidth: 1.5,
  borderColor: '#D1D5DB',
  backgroundColor: '#F9FAFB',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  gap: 14,
},

wizardSeveritySelected: {
  borderColor: '#66BB6A',
  backgroundColor: '#F1F8E9',
},

wizardSeverityText: {
  flex: 1,
  fontSize: 18,
  fontWeight: '700',
  color: '#374151',
},

wizardSeverityTextSelected: {
  color: '#2F7D32',
},

wizardRadio: {
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#D1D5DB',
  alignItems: 'center',
  justifyContent: 'center',
},

wizardRadioSelected: {
  borderColor: '#66BB6A',
},

wizardRadioInner: {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: '#66BB6A',
},

/* Review */

reviewCard: {
  backgroundColor: '#F9FAFB',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  paddingHorizontal: 18,
  marginBottom: 24,
},

reviewSection: {
  paddingVertical: 17,
},

reviewHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
},

reviewLabel: {
  fontSize: 14,
  fontWeight: '800',
  color: '#667085',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},

reviewEdit: {
  fontSize: 14,
  fontWeight: '800',
  color: '#2F7D32',
},

reviewValue: {
  fontSize: 17,
  fontWeight: '700',
  color: '#1F2937',
},

reviewMuted: {
  fontSize: 15,
  color: '#9CA3AF',
},

reviewDivider: {
  height: 1,
  backgroundColor: '#E5E7EB',
},

reviewPhotoRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
},

reviewPhoto: {
  width: 78,
  height: 78,
  borderRadius: 12,
  backgroundColor: '#E5E7EB',
},

reviewChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

reviewTypeChip: {
  backgroundColor: '#66BB6A',
  paddingHorizontal: 11,
  paddingVertical: 7,
  borderRadius: 999,
},

reviewNoteChip: {
  backgroundColor: '#42A5F5',
  paddingHorizontal: 11,
  paddingVertical: 7,
  borderRadius: 999,
},

reviewChipText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},

reviewNotes: {
  marginTop: 10,
  fontSize: 15,
  lineHeight: 22,
  color: '#374151',
},

startingFundCard: {
  marginBottom: 24,
  padding: 18,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#B7D7BA',
  backgroundColor: '#F1F8F2',
},

startingFundHeading: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 11,
},

startingFundHeadingCopy: {
  flex: 1,
},

startingFundTitle: {
  color: '#245F2A',
  fontSize: 17,
  fontWeight: '900',
},

startingFundText: {
  marginTop: 4,
  color: '#526C55',
  fontSize: 14,
  lineHeight: 20,
},

startingFundChoices: {
  marginTop: 16,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

startingFundChoice: {
  minHeight: 42,
  minWidth: 62,
  paddingHorizontal: 13,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#A9B9AA',
  backgroundColor: '#FFFFFF',
},

startingFundChoiceSelected: {
  borderColor: '#2F7D32',
  backgroundColor: '#2F7D32',
},

startingFundChoiceText: {
  color: '#405044',
  fontSize: 14,
  fontWeight: '800',
},

startingFundChoiceTextSelected: {
  color: '#FFFFFF',
},

startingFundOtherRow: {
  minHeight: 52,
  marginTop: 13,
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#9DB29F',
  borderRadius: 13,
  backgroundColor: '#FFFFFF',
},

startingFundDollar: {
  paddingLeft: 14,
  color: '#245F2A',
  fontSize: 21,
  fontWeight: '900',
},

startingFundOtherInput: {
  flex: 1,
  minHeight: 52,
  paddingHorizontal: 8,
  color: '#1F2937',
  fontSize: 20,
  fontWeight: '800',
},

startingFundTotal: {
  marginTop: 13,
  color: '#315F35',
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '700',
},

startingFundHelper: {
  marginTop: 12,
  color: '#68756B',
  fontSize: 13,
},

wizardSubmitButton: {
  minHeight: 56,
  borderRadius: 16,
  backgroundColor: '#66BB6A',
  flexDirection: 'row',
  gap: 9,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
},

wizardSubmitText: {
  color: '#FFFFFF',
  fontSize: 17,
  fontWeight: '800',
},


/* Persistent bottom navigation */

wizardFooter: {
  minHeight: 82,
  paddingHorizontal: 22,
  paddingTop: 12,
  paddingBottom: 20,
  borderTopWidth: 1,
  borderTopColor: 'rgba(0,0,0,0.08)',
  backgroundColor: '#FFFFFF',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

wizardArrowButton: {
  width: 52,
  height: 52,
  alignItems: 'center',
  justifyContent: 'center',
},

wizardDots: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

wizardProgress: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
},

wizardProgressText: {
  marginBottom: 5,
  color: '#667085',
  fontSize: 11,
  fontWeight: '800',
},

wizardDot: {
  width: 7,
  height: 7,
  borderRadius: 3.5,
  backgroundColor: '#D1D5DB',
},

wizardDotActive: {
  width: 9,
  height: 9,
  borderRadius: 4.5,
  backgroundColor: '#2F7D32',
},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingTop: 100,      // ⬅️ Add this
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 12,
    paddingBottom: 85,   // ⬅️ Enough room so last input isn’t jammed
  },
  sheetTitle: {
    fontSize: 20,
    top: 25,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F5F6F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12, marginTop: 6 },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelBtn: { backgroundColor: '#EAEAEA' },
  saveBtn: { backgroundColor: '#81C784' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityChip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F6F7',
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  severityChipSelected: {
    backgroundColor: '#81C784',
    borderColor: '#FB8C00',
  },
  severityChipText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  severityChipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  centerButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#fff',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mapTypeButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#fff',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  photoButton: {
    backgroundColor: '#FFCC80',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  photoContainer: {
    position: 'relative',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  photoHelper: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 4,
  },
  section: {
    marginTop: 14,   // adjust to taste (12–20 works great)
    marginbottom: 14,
  },
  typeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F6F7',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  typeChipSelected: {
    backgroundColor: '#81C784',
    borderColor: '#66BB6A',
  },
  typeChipIcon: {
    marginRight: 6,
  },
  typeChipText: {
    fontSize: 13,
    color: '#333',
  },
  typeChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  typeBox: {
  backgroundColor: '#E8F5E9',
  borderRadius: 12,
  padding: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#C8E6C9',
},
typeChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
typeChip: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderRadius: 20,
  backgroundColor: '#F1F8E9',
  borderWidth: 1,
  borderColor: '#C5E1A5',
},
typeChipSelected: {
  backgroundColor: '#66BB6A',
  borderColor: '#388E3C',
},
typeChipIcon: {
  marginRight: 6,
},
typeChipText: {
  fontSize: 13,
  color: '#333',
},
typeChipTextSelected: {
  color: '#fff',
  fontWeight: '600',
},
notesBox: {
  backgroundColor:'#E3F2FD',      
  borderRadius: 12,
  padding: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#BBDEFB',
},
notesChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
notesChip: {
  flexDirection: 'row',      // 👈 put icon + text in a row
  alignItems: 'center',      // 👈 vertically center icon + text
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 18,
  backgroundColor: '#D0E8FF',
  borderWidth: 1,
  borderColor: '#C8E6C9',
},
notesChipSelected: {
  backgroundColor: '#42A5F5',        // stronger pink/red
  borderColor: '#1E88E5',
},
notesChipText: {
  fontSize: 13,
  color: '#333',
},
notesChipTextSelected: {
  color: '#fff',
  fontWeight: '600',
},
notesChipIcon: {
  marginRight: 6,
},
footerBar: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  flexDirection: 'row',
  padding: 16,
  gap: 12,
  backgroundColor: 'white',
  borderTopWidth: 1,
  borderColor: 'rgba(0,0,0,0.08)',
}, 
supportButton: {
  position: "absolute",
  top: 85,
  right: 14,
  backgroundColor: "rgba(255,255,255,0.95)",
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: "center",
  justifyContent: "center",
  // optional shadow (if you already use shadows elsewhere)
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
},

/* ============================= */
/* Redesigned Report Detail View */
/* ============================= */

reportSheet: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  overflow: 'hidden',
},

reportDetailsLoadingOverlay: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 100,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 32,
  backgroundColor: '#FFFFFF',
},

reportDetailsLoadingClose: {
  position: 'absolute',
  top: 18,
  right: 18,
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F3F4F6',
},

reportDetailsLoadingText: {
  marginTop: 14,
  color: '#526057',
  fontSize: 15,
  fontWeight: '700',
  textAlign: 'center',
},


/* Main vertical report scroll */

reportPostScrollContent: {
  paddingTop: 72,
  paddingBottom: 24,
},

reportPostScrollContentWithActions: {
  paddingBottom: 24,
},

originalReportDivider: {
  paddingHorizontal: 22,
  paddingTop: 25,
  paddingBottom: 22,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: '#C9D8CB',
  backgroundColor: '#FFFFFF',
},

originalReportEyebrow: {
  color: '#6B776D',
  fontSize: 11,
  letterSpacing: 1.05,
  fontWeight: '800',
},

originalReportTitle: {
  marginTop: 5,
  color: '#263129',
  fontSize: 23,
  lineHeight: 29,
  fontWeight: '900',
},

originalReportText: {
  marginTop: 7,
  color: '#6A746C',
  fontSize: 14,
  lineHeight: 20,
},


/* ============================= */
/* Header                        */
/* ============================= */

reportPostHeader: {
  paddingHorizontal: 22,
  paddingBottom: 22,
},

reportPostTitle: {
  marginTop: 14,
  fontSize: 25,
  lineHeight: 32,
  fontWeight: '800',
  color: '#1F2937',
  marginBottom: 12,
},

rewardBadge: {
  alignSelf: 'flex-start',
  marginBottom: 18,
  paddingHorizontal: 12,
  paddingVertical: 8,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  borderRadius: 999,
  backgroundColor: '#E3EEE4',
},

rewardBadgeText: {
  color: '#245F2A',
  fontSize: 14,
  fontWeight: '900',
},

reportMetaStack: {
  gap: 11,
  marginBottom: 18,
},

reportMetaItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
},

reportMetaItemLabel: {
  fontSize: 12,
  fontWeight: '800',
  color: '#667085',
  textTransform: 'uppercase',
  letterSpacing: 0.45,
  marginBottom: 2,
},

reportMetaItemText: {
  fontSize: 14,
  color: '#667085',
},

beforePhotoHeading: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 22,
  paddingBottom: 12,
},

beforePhotoHeadingText: {
  color: '#4F5A52',
  fontSize: 17,
  fontWeight: '900',
},


/* ============================= */
/* Severity                      */
/* ============================= */

reportSeverityPill: {
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 999,
},

severityLow: {
  backgroundColor: '#66BB6A',
},

severityMedium: {
  backgroundColor: '#FFB74D',
},

severityHigh: {
  backgroundColor: '#E57373',
},

reportSeverityText: {
  fontSize: 14,
  fontWeight: '800',
  color: '#FFFFFF',
},


/* ============================= */
/* Main photo carousel           */
/* ============================= */

reportPhotoCarousel: {
  alignSelf: 'center',
  position: 'relative',
  borderRadius: 22,
  overflow: 'hidden',
  backgroundColor: '#F3F4F6',
},

reportHeroImage: {
  height: 355,
  backgroundColor: '#E5E7EB',
},

reportPhotoCounter: {
  position: 'absolute',
  top: 14,
  right: 14,
  backgroundColor: 'rgba(17,24,39,0.72)',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 999,
},

reportPhotoCounterText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '800',
},

reportPhotoDots: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  marginTop: 13,
  marginBottom: 4,
},

reportPhotoDot: {
  width: 7,
  height: 7,
  borderRadius: 3.5,
  backgroundColor: '#D1D5DB',
},

reportPhotoDotActive: {
  width: 9,
  height: 9,
  borderRadius: 4.5,
  backgroundColor: '#2F7D32',
},


/* Loading photo state */

reportPhotoLoadingCard: {
  marginHorizontal: 20,
  height: 260,
  borderRadius: 22,
  backgroundColor: '#F9FAFB',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E5E7EB',
},

reportPhotoLoadingText: {
  marginTop: 12,
  fontSize: 14,
  fontWeight: '600',
  color: '#667085',
},


/* No-photo state */

reportNoPhotoCard: {
  marginHorizontal: 20,
  paddingVertical: 27,
  paddingHorizontal: 20,
  borderRadius: 20,
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  alignItems: 'center',
},

reportNoPhotoIcon: {
  width: 58,
  height: 58,
  borderRadius: 29,
  backgroundColor: '#F3F4F6',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 10,
},

reportNoPhotoTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: '#475467',
},

reportNoPhotoText: {
  marginTop: 4,
  fontSize: 13,
  lineHeight: 19,
  textAlign: 'center',
  color: '#98A2B3',
},


/* ============================= */
/* Post body                     */
/* ============================= */

reportPostBody: {
  paddingHorizontal: 22,
  paddingTop: 30,
},

reportPostSection: {
  marginBottom: 28,
},

reportSectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 13,
},

reportPostSectionTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: '#1F2937',
},


/* Chips */

reportChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 9,
},

reportChip: {
  paddingHorizontal: 13,
  paddingVertical: 8,
  borderRadius: 999,
},

reportChipText: {
  fontSize: 13,
  fontWeight: '700',
  color: '#FFFFFF',
},

reportTypeChip: {
  backgroundColor: '#66BB6A',
},

reportNoteChip: {
  backgroundColor: '#42A5F5',
},

/* Typed "Other" litter type */

reportOtherTypeChip: {
  backgroundColor: '#F1F8E9',
  borderWidth: 1,
  borderColor: '#A5D6A7',
},

reportOtherTypeText: {
  fontSize: 13,
  fontWeight: '700',
  color: '#2F7D32',
},


/* Additional descriptive text */

reportDetailsCard: {
  padding: 17,
  borderRadius: 16,
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#E5E7EB',
},

reportDetailsText: {
  fontSize: 16,
  lineHeight: 24,
  color: '#374151',
},

fundingFeedbackCard: {
  marginBottom: 18,
  padding: 17,
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 11,
  borderWidth: 1,
  borderColor: '#E5C58B',
  borderRadius: 18,
  backgroundColor: '#FFF8E8',
},

fundingFeedbackTitle: {
  color: '#754B13',
  fontSize: 15,
  fontWeight: '900',
},

fundingFeedbackText: {
  marginTop: 5,
  color: '#765C34',
  fontSize: 14,
  lineHeight: 20,
},

fundingCopy: {
  flex: 1,
},

cleanupEligibilityCard: {
  marginBottom: 28,
  padding: 18,
  borderWidth: 1,
  borderColor: '#C8D8C9',
  borderRadius: 18,
  backgroundColor: '#F4FAF4',
},

cleanupEligibilityHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
},

cleanupEligibilityIcon: {
  width: 46,
  height: 46,
  borderRadius: 23,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#E3F1E4',
},

cleanupEligibilityCopy: {
  flex: 1,
},

cleanupEligibilityTitle: {
  color: '#244A27',
  fontSize: 18,
  fontWeight: '800',
},

cleanupEligibilityText: {
  marginTop: 5,
  color: '#537056',
  fontSize: 14,
  lineHeight: 20,
},

cleanupButton: {
  minHeight: 52,
  marginTop: 17,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: '#66BB6A',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '#FFFFFF',
},

cleanupButtonDisabled: {
  opacity: 0.6,
},

cleanupButtonText: {
  color: '#2F7D32',
  fontSize: 16,
  fontWeight: '800',
},

reportFundButton: {
  borderWidth: 2,
  borderColor: '#66BB6A',
  backgroundColor: '#FFFFFF',
},

reportFundButtonText: {
  color: '#2F7D32',
  fontSize: 15,
  fontWeight: '800',
},

cleanupProgressCard: {
  marginBottom: 28,
  padding: 18,
  borderWidth: 1,
  borderColor: '#E7CF79',
  borderRadius: 18,
  backgroundColor: '#FFF9DD',
},

cleanupCompleteStatusCard: {
  borderColor: '#9CCB9F',
  backgroundColor: '#EDF8EE',
},

cleanupProgressHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
},

cleanupProgressIcon: {
  width: 46,
  height: 46,
  borderRadius: 23,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F8E9A6',
},

cleanupCompleteStatusIcon: {
  backgroundColor: '#D4ECD6',
},

cleanupProgressCopy: {
  flex: 1,
},

cleanupProgressTitle: {
  color: '#664B00',
  fontSize: 18,
  fontWeight: '800',
},

cleanupCompleteStatusTitle: {
  color: '#245F28',
},

cleanupProgressText: {
  marginTop: 5,
  color: '#806715',
  fontSize: 14,
  lineHeight: 20,
},

cleanupCompleteStatusText: {
  color: '#3E7041',
},

cleanupProgressLoading: {
  marginTop: 16,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

cleanupProgressLoadingText: {
  color: '#806715',
  fontSize: 14,
  fontWeight: '600',
},

cleanupActionStack: {
  marginTop: 18,
  gap: 10,
},

cleanupActionButton: {
  minHeight: 50,
  borderRadius: 13,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

cleanupNavigateButton: {
  backgroundColor: '#2F7D32',
},

cleanupCompleteButton: {
  borderWidth: 1,
  borderColor: '#8FBC92',
  backgroundColor: '#FFFFFF',
},

cleanupFeedbackButton: {
  borderWidth: 1,
  borderColor: '#D6BE71',
  backgroundColor: '#FFF9DD',
},

cleanupFeedbackActionText: {
  color: '#755900',
  fontSize: 15,
  fontWeight: '800',
},

cleanupReleaseButton: {
  borderWidth: 1,
  borderColor: '#D9A6A1',
  backgroundColor: '#FFFFFF',
},

cleanupPrimaryActionText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '800',
},

cleanupSecondaryActionText: {
  color: '#2F7D32',
  fontSize: 15,
  fontWeight: '800',
},

cleanupReleaseActionText: {
  color: '#A33A32',
  fontSize: 15,
  fontWeight: '800',
},

ownerReportLockCard: {
  marginHorizontal: 22,
  marginBottom: 28,
  padding: 16,
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
  borderWidth: 1,
  borderColor: '#D8E0D9',
  borderRadius: 16,
  backgroundColor: '#F6F8F6',
},

ownerReportLockCopy: {
  flex: 1,
},

ownerReportLockTitle: {
  color: '#344638',
  fontSize: 15,
  fontWeight: '800',
},

ownerReportLockText: {
  marginTop: 4,
  color: '#5F6E62',
  fontSize: 13,
  lineHeight: 19,
},


/* ============================= */
/* Persistent footer             */
/* ============================= */

reportFooter: {
  zIndex: 3,
  elevation: 3,
  flexShrink: 0,
  flexDirection: 'row',
  gap: 10,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 20,
  backgroundColor: '#FFFFFF',
},

reportUtilityBar: {
  zIndex: 2,
  elevation: 2,
  flexShrink: 0,
  flexDirection: 'row',
  gap: 10,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 12,
  backgroundColor: '#FFFFFF',
},

reportUtilityButton: {
  flex: 1,
  minHeight: 50,
  borderRadius: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

reportShareButton: {
  minHeight: 50,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: '#CDD5D0',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '#FFFFFF',
},

reportShareButtonText: {
  color: '#4F5C63',
  fontSize: 15,
  fontWeight: '800',
},

reportFooterButton: {
  flex: 1,
  minHeight: 52,
  borderRadius: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
},

reportDeleteButton: {
  borderWidth: 2,
  borderColor: '#E57373',
  backgroundColor: '#FFFFFF',
},

reportDeleteButtonText: {
  color: '#C94747',
  fontSize: 15,
  fontWeight: '800',
},

reportEditButton: {
  borderWidth: 2,
  borderColor: '#66BB6A',
  backgroundColor: '#FFFFFF',
},

reportEditButtonText: {
  color: '#2F7D32',
  fontSize: 15,
  fontWeight: '800',
},

reportCloseButton: {
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#D1D5DB',
},

reportCloseButtonText: {
  color: '#374151',
  fontSize: 15,
  fontWeight: '800',
},


// Status color and severity icon remain readable without shrinking the marker hit area.
reportMarkerHitLg: {
  width: 88,
  height: 88,
  borderRadius: 44,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.01)',
},

markerRewardBadge: {
  position: 'absolute',
  top: -2,
  zIndex: 2,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: '#8FBC92',
  borderRadius: 999,
  backgroundColor: '#FFFFFF',
},
markerRewardText: {
  color: '#245F2A',
  fontSize: 11,
  fontWeight: '900',
},
reportMarkerIconWrapLg: {
  width: 60,
  height: 60,
  borderRadius: 30,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 3,
  borderColor: '#FFFFFF',
  shadowColor: '#000000',
  shadowOpacity: 0.28,
  shadowRadius: 7,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,
},
reportMarkerStatusBadge: {
  position: 'absolute',
  right: -3,
  bottom: -3,
  width: 24,
  height: 24,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#374151',
},
compactMarkerHit: { alignItems: 'center', justifyContent: 'center' },
compactMarker: { paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#92A998', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
compactMarkerSelected: { backgroundColor: '#285D38', borderColor: '#FFFFFF' },
compactMarkerText: { color: '#285D38', fontSize: 14, fontWeight: '700' },
compactMarkerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', borderColor: '#285D38', borderWidth: 2 },
savingOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(255,255,255,0.88)',
  zIndex: 999,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 28,
},
savingCard: {
  width: '100%',
  maxWidth: 360,
  alignItems: 'center',
  paddingHorizontal: 24,
  paddingVertical: 28,
  borderRadius: 22,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#D9E8DA',
  shadowColor: '#000000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 7,
},
savingTitle: {
  marginTop: 17,
  color: '#202428',
  fontSize: 21,
  fontWeight: '900',
  textAlign: 'center',
},
savingStatus: {
  marginTop: 9,
  color: '#2F7D32',
  fontSize: 16,
  fontWeight: '800',
  textAlign: 'center',
},
savingHelper: {
  marginTop: 8,
  color: '#667078',
  fontSize: 14,
  lineHeight: 20,
  textAlign: 'center',
},



});
