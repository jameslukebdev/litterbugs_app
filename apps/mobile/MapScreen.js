// MapScreen.js
import { useCallback, useEffect, useRef, useState } from 'react';
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
  PanResponder,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  AppState,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Marker } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNShare from 'react-native-share';
import { supabase } from './lib/supabase'
import {
  canEditOrDeleteReport,
  canManageReport,
  isPermanentUser,
  permanentUserId,
} from './lib/reportAccess';
import { BOTTOM_NAV_METRICS, getBottomNavClearance } from './lib/navigationLayout';
import { useReports } from './lib/reports';
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
import { shouldClusterReports } from './lib/mapClustering';
import { hasRequiredReportPhoto } from './lib/reportDraft';
import {
  MAX_REPORT_PHOTOS,
  mergeReportPhotoUris,
  reportPhotoPickerOptions,
} from './lib/reportPhotoSelection';
import { uploadSecureMedia } from './lib/secureMediaUpload';
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

const MAP_MARKER_TRANSITION_MS = 180;

function MapMarkerTransition({ children, transitionKey }) {
  const opacity = useRef(new Animated.Value(0.72)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    opacity.setValue(0.72);
    scale.setValue(0.94);

    const transition = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: MAP_MARKER_TRANSITION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: MAP_MARKER_TRANSITION_MS,
        useNativeDriver: true,
      }),
    ]);

    transition.start();
    return () => transition.stop();
  }, [opacity, scale, transitionKey]);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
}

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
export default function MapScreen({ route, navigation }) {
  const isMapScreenFocused = useIsFocused();
  const REPORT_STEPS = [
    'Title',
    'Photos',
    'Litter Types',
    'Severity',
    'Notes',
    'Review',
  ];
  const MAX_REPORT_DISTANCE_MILES = 10;
  const [tracksReportMarkers, setTracksReportMarkers] = useState(true);
  const reportMarkerTrackingTimerRef = useRef(null);
  const reportClusterRef = useRef();
  const [draftCoord, setDraftCoord] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [reportStep, setReportStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportPhotoUrls, setReportPhotoUrls] = useState([]);
  const [editingReportId, setEditingReportId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  const cleanupNoticeCheckInFlight = useRef(false);
  // Report detail photo carousel
  const [reportPhotoIndex, setReportPhotoIndex] = useState(0);
  const { user: currentUser } = useSession();
  const {
    profile: currentProfile,
    blockedIds,
    pendingReportCoordinate,
    setPendingReportCoordinate,
    consumePendingReportCoordinate,
    refreshProfile,
  } = useProfile();
  const {
    markers,
    mapRegion: region,
    setMapRegion: setRegion,
    commitMapRegion,
    refreshReports,
    getReportById,
    upsertReport,
    removeReport,
  } = useReports();
  const currentUserId = permanentUserId(currentUser);
  const fundingEnabled = paymentsEnabled && geminiReviewEnabled;
  const reportClusteringEnabled = shouldClusterReports(region);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const bottomNavClearance = getBottomNavClearance(insets.bottom);

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
const wantsStartingFunding = fundingEnabled
  && !isEditing
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

// Pressing Map opens Litter Form
// Reports can only be created near the user's current GPS location
const beginReportAtCoordinate = async (coord) => {
  try {
    if (!navigation.isFocused()) return;

    // Check whether location permission is available
    let permission = await Location.getForegroundPermissionsAsync();

    if (!navigation.isFocused()) return;

    if (permission.status !== 'granted' && permission.canAskAgain !== false) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (!navigation.isFocused()) return;

    if (permission.status !== 'granted') {
      showLocationSettingsAlert(
        'Litterbugs needs your location to verify that a report is near you.'
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
    if (!navigation.isFocused()) return;

    const userCoord = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };

    // Calculate distance from user to selected report location
    const distanceMiles = getDistanceMiles(userCoord, coord);

    // Block reports that are outside the permitted radius
    if (distanceMiles > MAX_REPORT_DISTANCE_MILES) {
      Alert.alert(
        'Report Location Too Far Away',
        `Litterbugs reports can only be created within ${MAX_REPORT_DISTANCE_MILES} miles of your current location. You can still browse and view reports anywhere on the map.`
      );
      return;
    }

    // Location is valid — continue opening the report form
    setDraftCoord(coord);

    setForm({
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
    setFormOpen(true);

  } catch (error) {
    console.log('Report location verification error:', error);

    if (!navigation.isFocused()) return;

    Alert.alert(
      'Unable to Verify Location',
      'Litterbugs could not determine your current location. Please try again.'
    );
  }
};

const onMapPress = (e) => {
  const coord = e.nativeEvent.coordinate;
  if (!isPermanentUser(currentUser)) {
    setPendingReportCoordinate(coord);
    navigation.getParent()?.navigate('Auth');
    return;
  }

  beginReportAtCoordinate(coord);
};

useEffect(() => {
  if (!isMapScreenFocused || !currentUserId || !pendingReportCoordinate) return;
  const coordinate = consumePendingReportCoordinate();
  if (coordinate) beginReportAtCoordinate(coordinate);
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


// Save Report Function
  const saveReport = async () => {
    if (!draftCoord && !isEditing) return;
  
    try {
      const userId = permanentUserId(currentUser);

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
            userId
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
            requestGeminiReview({ reportId: editingReportId }).catch((reviewError) => {
              console.log('Updated report funding photo review deferred:', reviewError);
            });
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
            userId
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
          if (wantsStartingFunding) {
            try {
              await requestGeminiReview({ reportId: data.id });
            } catch (reviewError) {
              console.log('Report funding photo review deferred:', reviewError);
            }
          } else {
            requestGeminiReview({ reportId: data.id }).catch((reviewError) => {
              console.log('Report funding photo review deferred:', reviewError);
            });
          }
        }
      }
  
      upsertReport({ ...data, reporter: data.reporter || currentProfile });
      if (isEditing) await refreshReports({ showRefresh: false });
      else await refreshProfile();
  
      setDraftCoord(null);
      setFormOpen(false);
      setIsEditing(false);
      setEditingReportId(null);
      resetReportWizard();

      if (!isEditing && startingContributionCents) {
        navigation.getParent()?.navigate('FundingContribution', {
          reportId: data.id,
          initialAmount: (startingContributionCents / 100).toFixed(2),
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

  if (!hasAttachedReportPhoto()) {
    Alert.alert(
      'Photo required',
      'Add at least one clear photo so volunteers can identify the cleanup site.'
    );
    jumpToReportStep(1);
    return;
  }

  if (wantsStartingFunding && !startingContributionCents) {
    Alert.alert(
      'Enter a valid contribution',
      'Choose at least $5 and no more than $5,000, or select Not now.'
    );
    return;
  }

  setIsSaving(true);

  try {
    await saveReport();
  } finally {
    setIsSaving(false);
  }
};

  // Cancel Report
  const cancelDraft = () => {
    setDraftCoord(null);
    setFormOpen(false);
    setIsEditing(false);
    setEditingReportId(null);
    resetReportWizard();
  };

// User Can Center Back to their Location on Map
  const centerOnUser = async () => {
    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== 'granted' && permission.canAskAgain !== false) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        showLocationSettingsAlert(
          'Allow location access to center the map on your position.'
        );
        return;
      }

      setLocationPermissionGranted(true);
      const loc = await Location.getCurrentPositionAsync({});
      commitMapRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    } catch (e) {
      console.log('Center error:', e);
      Alert.alert('Location Error', 'Unable to find your location.');
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
  const getMapTypeColor = () => {
    switch (mapType) {
      case 'standard':
        return '#B39DDB'; // light purple
      case 'satellite':
        return '#A5D6A7'; // light green
      case 'hybrid':
        return '#FBC02D'; // yellow
      case 'terrain': // Android only
        return '#66BB6A'; // another green tone
      default:
        return '#2F7D32';
    }
  };


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
  const pickImage = async () => {
    if (isSaving) return;
    console.log('pickImage RUNNING');

    try {
      // PHPicker grants access only to the photos the user selects, so requesting
      // full-library permission first is unnecessary and can open a separate
      // limited-access sheet instead of the report photo picker on iOS.
      const result = await ImagePicker.launchImageLibraryAsync(
        reportPhotoPickerOptions(form.photos.length)
      );
      console.log('RAW picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setForm((prev) => ({
          ...prev,
          photos: mergeReportPhotoUris(prev.photos, result.assets),
        }));
      }
    } catch (e) {
      console.log('Image picker error:', e);
      Alert.alert('Error', 'Unable to open the photo library right now.');
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
    const uploadReportPhotos = async (photoUris, reportId, userId) => {
      const uploadedPaths = [];

      try {
        for (let i = 0; i < photoUris.length; i++) {
          const uri = photoUris[i];
          // Read local file as base64
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });

          // Convert base64 -> bytes
          const bytes = base64ToUint8Array(base64);
          if (bytes.byteLength > 5 * 1024 * 1024) {
            throw new Error('Each report photo must be 5 MB or smaller.');
          }

          // File naming
          const candidateExt = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
          const fileExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(candidateExt)
            ? candidateExt
            : 'jpg';
          const mimeType = `image/${['jpg', 'jpeg'].includes(fileExt) ? 'jpeg' : fileExt}`;
          const filePath = await uploadSecureMedia({
            userId,
            kind: 'report',
            bytes,
            mimeType,
            subjectId: reportId,
          });
          uploadedPaths.push(filePath);
        }
        return uploadedPaths;
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
    
    const getSignedPhotoUrl = async (path) => {
      const { data, error } = await supabase.storage
        .from('report_photos')
        .createSignedUrl(path, 60 * 60); // 1 hour
    
      if (error) {
        console.error('Signed URL error:', error);
        return null;
      }

      return data.signedUrl;
    };


// Set available marker icons by severity and active/completed markers by status.
    const getMarkerStyleByReport = (report) => {
      const mapTone = cleanupMapTone(report);

      if (mapTone === 'active') {
        return {
          bg: '#E0A800',
          icon: 'time-outline',
          iconFamily: 'ionicons',
          statusIcon: null,
        };
      }

      if (mapTone === 'completed') {
        return {
          bg: '#2F7D32',
          icon: 'leaf-outline',
          iconFamily: 'ionicons',
          statusIcon: 'checkmark',
        };
      }

      const severity = (report?.severity || '').toLowerCase();
      const isLowSeverity = severity === 'low';
      const icon = isLowSeverity
        ? 'bottle-soda-outline'
        : severity === 'high'
          ? 'warning-outline'
          : 'trash-outline';

      return {
        bg: '#D32F2F',
        icon,
        iconFamily: isLowSeverity ? 'material-community' : 'ionicons',
        statusIcon: null,
      };
    };

    const getClusterStatusCounts = (clusterId) => {
      const leaves = reportClusterRef.current?.getLeaves(clusterId, Infinity) || [];

      return leaves.reduce((counts, leaf) => {
        const [, mapTone] = String(leaf?.properties?.identifier || '').split(':');

        if (mapTone === 'available' || mapTone === 'active' || mapTone === 'completed') {
          counts[mapTone] += 1;
        }

        return counts;
      }, { available: 0, active: 0, completed: 0 });
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

const openReportDetails = (report) => {
  if (!report) return;
  setSelectedReport(report);
  setDetailsOpen(true);
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
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
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
  const loadPhotoUrls = async () => {
    // Always begin a newly opened report on its first photo
    setReportPhotoIndex(0);
    setPhotosLoading(true);

    if (!selectedReport?.photo_paths?.length) {
      setReportPhotoUrls([]);
      setPhotosLoading(false);
      return;
    }

    const urls = await Promise.all(
      selectedReport.photo_paths.map((p) => getSignedPhotoUrl(p))
    );

    setReportPhotoUrls(urls.filter(Boolean));
    setPhotosLoading(false);
  };

  loadPhotoUrls();
}, [selectedReport]);

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
  const currentUserIsCleaner = isCurrentCleaner(
    selectedCleanupAttempt,
    currentUser
  );
  const currentUserIsReporter = Boolean(
    currentUserId
    && selectedCleanupAttempt?.reporter_id === currentUserId
  );
  const selectedReportIsShareable = isReportShareable(selectedReport);

  useEffect(() => {
    if (!detailsOpen) setReportShareSheetOpen(false);
  }, [detailsOpen]);

  useEffect(() => {
    setReportShareSheetOpen(false);
  }, [selectedReport?.id]);

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
        share: RNShare.open,
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

    if (!RNShare.shareSingle || !RNShare.Social?.INSTAGRAM_STORIES) {
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
        isPackageInstalled: RNShare.isPackageInstalled,
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
        shareSingle: RNShare.shareSingle,
        instagramStoriesSocial: RNShare.Social.INSTAGRAM_STORIES,
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

  const executeCleanupClaim = async () => {
    if (!selectedReport?.id || cleanupActionBusy) return;

    try {
      setCleanupActionBusy(true);
      if (Number(selectedReport.funded_amount_cents) > 0) {
        const payout = await loadPayoutStatus();
        if (!payout?.payoutsEnabled) {
          throw new Error('cleaner_payout_onboarding_required');
        }
      }
      const claimedAttempt = await claimCleanup(selectedReport.id);

      const claimedReport = {
        ...selectedReport,
        cleanup_state: 'claimed',
      };

      setSelectedCleanupAttempt(claimedAttempt);
      setSelectedReport(claimedReport);
      upsertReport(claimedReport);

      Alert.alert(
        'Cleanup claimed',
        `Complete by ${new Date(claimedAttempt.claim_expires_at).toLocaleString()}.`
      );
    } catch (error) {
      if (/cleaner_payout_onboarding_required/i.test(error?.message ?? '')) {
        Alert.alert(
          'Payout setup required',
          'Finish Stripe payout setup before claiming a funded cleanup.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Set up payouts',
              onPress: () => {
                setDetailsOpen(false);
                navigation.getParent()?.navigate('PayoutSetup');
              },
            },
          ]
        );
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
            Add at least one clear photo so volunteers can identify the
            site and see what the area looked like before cleanup.
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

              <TouchableOpacity
                style={styles.replacePhotoButton}
                onPress={pickImage}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Replace report photos"
              >
                <Text style={styles.replacePhotoButtonText}>Choose replacement photos</Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                style={[
                  styles.wizardPhotoButton,
                  form.photos.length >= 3 &&
                    styles.wizardDisabled,
                ]}
                onPress={pickImage}
                disabled={
                  isSaving ||
                  form.photos.length >= 3
                }
                accessibilityRole="button"
                accessibilityLabel={
                  form.photos.length >= MAX_REPORT_PHOTOS
                    ? 'Three report photos added'
                    : isEditing
                      ? `Choose up to ${MAX_REPORT_PHOTOS - form.photos.length} replacement photos`
                      : `Choose up to ${MAX_REPORT_PHOTOS - form.photos.length} report photos`
                }
              >
                <View style={styles.wizardPhotoIcon}>
                  <Ionicons
                    name="camera-outline"
                    size={34}
                    color="#2F7D32"
                  />
                </View>

                <Text style={styles.wizardPhotoButtonTitle}>
                  {form.photos.length >= MAX_REPORT_PHOTOS
                    ? '3 photos added'
                    : form.photos.length > 0
                      ? `Add up to ${MAX_REPORT_PHOTOS - form.photos.length} more`
                      : isEditing ? 'Choose replacement photos' : 'Choose photos'}
                </Text>

                <Text style={styles.wizardPhotoHelper}>
                  Select up to 3 at once
                </Text>
              </TouchableOpacity>

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
            style={[
              styles.input,
              styles.wizardNotesInput,
            ]}
            placeholder="Add any extra details"
            value={form.notes}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                notes: text,
              }))
            }
            multiline
            textAlignVertical="top"
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
                    Optionally add your own contribution after this report’s photo passes its safety check.
                  </Text>
                </View>
              </View>

              <View style={styles.startingFundChoices}>
                {[
                  { value: 'none', label: 'Not now' },
                  { value: '5', label: '$5' },
                  { value: '15', label: '$15' },
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
                        ? 'Do not start a cleanup fund'
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
                    onChangeText={(value) => setForm((current) => ({
                      ...current,
                      startingFundingOther: value,
                    }))}
                    keyboardType="decimal-pad"
                    placeholder="5.00"
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
                  <Text style={styles.requiredHint}>Enter an amount from $5 to $5,000.</Text>
                )
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
              <ActivityIndicator color="#fff" />
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
        <ClusteredMapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          region={region}
          onRegionChangeComplete={(nextRegion) => {
            setRegion(nextRegion);
            refreshReportMarkerSnapshots();
          }}
          maxZoom={14}
          radius={20}
          animationEnabled={false}
          clusteringEnabled={reportClusteringEnabled}
          superClusterRef={reportClusterRef}
          renderCluster={({ id, geometry, properties, onPress }) => {
            const statusCounts = getClusterStatusCounts(id);
            const statusBadges = [
              {
                key: 'available',
                count: statusCounts.available,
                color: '#D32F2F',
                icon: 'trash-bin-outline',
              },
              {
                key: 'active',
                count: statusCounts.active,
                color: '#9A7000',
                icon: 'time-outline',
              },
              {
                key: 'completed',
                count: statusCounts.completed,
                color: '#2F7D32',
                icon: 'leaf-outline',
              },
            ].filter(({ count }) => count > 0);

            return (
              <Marker
                key={`cluster-${id}`}
                coordinate={{
                  latitude: geometry.coordinates[1],
                  longitude: geometry.coordinates[0],
                }}
                tracksViewChanges={tracksReportMarkers}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={(event) => {
                  event?.stopPropagation?.();
                  onPress();
                }}
              >
                <MapMarkerTransition transitionKey={`cluster-${id}`}>
                  <View style={styles.reportClusterHit}>
                    <View style={styles.reportClusterBubble}>
                      <Text style={styles.reportClusterText}>
                        {properties.point_count}
                      </Text>
                    </View>
                    <View style={styles.reportClusterStatusRow}>
                      {statusBadges.map(({ key, count, color, icon }) => (
                        <View
                          key={key}
                          style={[styles.reportClusterStatusBadge, { borderColor: color }]}
                        >
                          <Ionicons name={icon} size={11} color={color} />
                          <Text style={[styles.reportClusterStatusCount, { color }]}>
                            {count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </MapMarkerTransition>
              </Marker>
            );
          }}
          onPress={(e) => {
            if (detailsOpen || isSaving) return;
            onMapPress(e);
          }}          
          {...(locationPermissionGranted ? { showsUserLocation: true } : {})}
          followsUserLocation={false}
          mapType={mapType}
        >

        {markers.map((m) => {
          const {
            bg,
            icon,
            iconFamily,
            statusIcon,
          } = getMarkerStyleByReport(m?.report);

          return (
            <Marker
              key={m.id}
              coordinate={m.coordinate}
              identifier={`report:${cleanupMapTone(m.report)}:${m.id}`}
              tracksViewChanges={tracksReportMarkers}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={(e) => {
                e?.stopPropagation?.();
                openReportDetails(m.report);
              }}
            >
              <MapMarkerTransition
                transitionKey={`${reportClusteringEnabled ? 'clustered' : 'direct'}:${m.id}`}
              >
                <View style={styles.reportMarkerHitLg}>
                  {fundingEnabled
                    && selectedReport?.id === m.report?.id
                    && Number(m.report?.funded_amount_cents) > 0 ? (
                    <View style={styles.markerRewardBadge}>
                      <Text style={styles.markerRewardText}>{formatUsd(m.report.funded_amount_cents)}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.reportMarkerIconWrapLg, { backgroundColor: bg }]}>
                    {iconFamily === 'material-community' ? (
                      <MaterialCommunityIcons name={icon} size={34} color="#fff" />
                    ) : (
                      <Ionicons name={icon} size={34} color="#fff" />
                    )}
                    {statusIcon ? (
                      <View style={styles.reportMarkerStatusBadge}>
                        <Ionicons name={statusIcon} size={16} color="#374151" />
                      </View>
                    ) : null}
                  </View>
                </View>
              </MapMarkerTransition>
            </Marker>
          );
        })}


        {draftCoord && (
          <Marker
            coordinate={draftCoord}
            cluster={false}
            pinColor="#FFC42E"
            title="Draft report"
            description="Fill the form below to save"
          />
        )}
      </ClusteredMapView>

        {/* Support Button (Patreon) */}
        {/* <TouchableOpacity
          style={styles.supportButton}
          onPress={openPatreon}
          accessibilityRole="button"
          accessibilityLabel="Support Litterbugs on Patreon"
        >
          <Ionicons name="heart" size={22} color="#E53935" />
        </TouchableOpacity> */}


      {/* Center Me Button */}
      <TouchableOpacity
        style={[
          styles.centerButton,
          {
            bottom:
              mapControlsBottom +
              BOTTOM_NAV_METRICS.mapControlSize +
              BOTTOM_NAV_METRICS.mapControlGap,
          },
        ]}
        onPress={centerOnUser}
        accessibilityRole="button"
        accessibilityLabel="Center map on your location"
      >
        <Ionicons name="navigate-outline" size={32} color="#42A5F5" />
      </TouchableOpacity>

      {/* Map Type Toggle Button */}
      <TouchableOpacity
        style={[styles.mapTypeButton, { bottom: mapControlsBottom }]}
        onPress={toggleMapType}
        accessibilityRole="button"
        accessibilityLabel="Change map style"
      >
        <Ionicons name="layers-outline" size={32} color={getMapTypeColor()} />
      </TouchableOpacity>

{/* Multi-step Report Form */}
<Modal
  visible={formOpen}
  animationType="slide"
  transparent
  onRequestClose={cancelDraft}
>
  <View style={styles.modalBackdrop}>
    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      style={styles.wizardKeyboardView}
    >
      <View style={styles.wizardSheet}>

        {isSaving && (
          <View
            style={styles.savingOverlay}
            pointerEvents="auto"
          />
        )}


        {/* Persistent Header */}
        <View style={styles.wizardHeader}>

          <View style={{ flex: 1 }}>
            <Text style={styles.wizardHeaderTitle}>
              {isEditing
                ? 'Edit Litter Report'
                : 'New Litter Report'}
            </Text>

            <Text style={styles.wizardHeaderStep}>
              {REPORT_STEPS[reportStep]}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.wizardCloseButton}
            onPress={cancelDraft}
            disabled={isSaving}
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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.wizardScrollContent
            }
          >
            {renderReportStep()}
          </ScrollView>
        </Animated.View>


        {/* Persistent bottom navigation */}
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


          {/* RIGHT */}
          <TouchableOpacity
            style={styles.wizardArrowButton}
            onPress={goToNextReportStep}
            disabled={
              reportStep ===
                REPORT_STEPS.length - 1 ||
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
      </View>
    </KeyboardAvoidingView>
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
    if (!reportShareBusyAction) setDetailsOpen(false);
  }}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.reportSheet}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={[
          styles.reportPostScrollContent,
          selectedReportIsShareable && styles.reportPostScrollContentShareable,
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

        {/* ============================= */}
        {/* Report Header                 */}
        {/* ============================= */}

        <View style={styles.reportPostHeader}>

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

          <Text style={styles.reportPostTitle}>
            {selectedReport?.title || 'Litter Report'}
          </Text>

          {fundingEnabled && Number(selectedReport?.funded_amount_cents) > 0 ? (
            <View style={styles.rewardBadge}>
              <Ionicons name="cash-outline" size={18} color="#245F2A" />
              <Text style={styles.rewardBadgeText}>
                Cleaner receives {formatUsd(selectedReport.funded_amount_cents)}
              </Text>
            </View>
          ) : null}

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
                    {new Date(
                      selectedReport.created_at
                    ).toLocaleString()}
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
                    {Number(selectedReport.latitude).toFixed(5)}, {Number(selectedReport.longitude).toFixed(5)}
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
        {/* Main Photo / Carousel         */}
        {/* ============================= */}

        {selectedReport?.cleanup_state === 'completed' ? (
          <View style={styles.beforePhotoHeading}>
            <Ionicons name="images-outline" size={20} color="#667085" />
            <Text style={styles.beforePhotoHeadingText}>Before cleanup</Text>
          </View>
        ) : null}

        {photosLoading ? (

          <View style={styles.reportPhotoLoadingCard}>
            <ActivityIndicator
              size="large"
              color="#66BB6A"
            />

            <Text style={styles.reportPhotoLoadingText}>
              Loading photos…
            </Text>
          </View>

        ) : reportPhotoUrls.length > 0 ? (

          <View
            style={[
              styles.reportPhotoCarousel,
              {
                width: reportHeroWidth,
                ...(Platform.OS === 'android' ? { overflow: 'visible' } : null),
              },
            ]}
          >

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={reportHeroWidth}
              onMomentumScrollEnd={(event) => {
                const offsetX =
                  event.nativeEvent.contentOffset.x;

                const nextIndex = Math.round(
                  offsetX / reportHeroWidth
                );

                setReportPhotoIndex(nextIndex);
              }}
            >

              {reportPhotoUrls.map((uri, index) =>
                Platform.OS === 'android' ? (
                  <ExpoImage
                    key={`${uri}-${index}`}
                    source={uri}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    style={{
                      width: reportHeroWidth,
                      height: 355,
                      borderRadius: 22,
                      backgroundColor: '#E5E7EB',
                    }}
                  />
                ) : (
                  <Image
                    key={`${uri}-${index}`}
                    source={{ uri }}
                    resizeMode="cover"
                    style={[
                      styles.reportHeroImage,
                      {
                        width: reportHeroWidth,
                      },
                    ]}
                  />
                )
              )}

            </ScrollView>


            {/* Instagram-style photo count */}
            {reportPhotoUrls.length > 1 && (
              <View style={styles.reportPhotoCounter}>
                <Text style={styles.reportPhotoCounterText}>
                  {reportPhotoIndex + 1}/{reportPhotoUrls.length}
                </Text>
              </View>
            )}

          </View>

        ) : (

          /* Graceful layout for reports without photos */
          <View style={styles.reportNoPhotoCard}>

            <View style={styles.reportNoPhotoIcon}>
              <Ionicons
                name="image-outline"
                size={32}
                color="#98A2B3"
              />
            </View>

            <Text style={styles.reportNoPhotoTitle}>
              {selectedReport?.cleanup_state === 'completed'
                ? 'No original photo was provided'
                : 'No photo added'}
            </Text>

            <Text style={styles.reportNoPhotoText}>
              {selectedReport?.cleanup_state === 'completed'
                ? 'The cleanup impact remains available with its after photos and details.'
                : 'This report was submitted without a photo.'}
            </Text>

          </View>
        )}


        {/* Photo pagination dots */}
        {!photosLoading &&
          reportPhotoUrls.length > 1 && (

          <View style={styles.reportPhotoDots}>

            {reportPhotoUrls.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.reportPhotoDot,

                  index === reportPhotoIndex &&
                    styles.reportPhotoDotActive,
                ]}
              />
            ))}

          </View>
        )}


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
                      : 'The report can still be cleaned by volunteers while this check finishes.')}
                </Text>
              </View>
            </View>
          ) : null}

          {fundingEnabled
            && selectedReport?.cleanup_state === 'available'
            && selectedReport?.renewal_status === 'active'
            && selectedReport?.funding_eligibility === 'eligible' ? (
            <View style={styles.fundingCard}>
              <View style={styles.fundingCopy}>
                <Text style={styles.fundingTitle}>Cleanup fund</Text>
                <Text style={styles.fundingAmount}>Cleaner receives {formatUsd(selectedReport?.funded_amount_cents)}</Text>
                <Text style={styles.fundingText}>Add to the reward that motivates someone to complete this cleanup.</Text>
              </View>
              <TouchableOpacity
                style={styles.fundingButton}
                onPress={() => {
                  setDetailsOpen(false);
                  if (!currentUserId) {
                    navigation.getParent()?.navigate('Auth');
                  } else {
                    navigation.getParent()?.navigate('FundingContribution', { reportId: selectedReport.id });
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Add to cleanup fund"
              >
                <Text style={styles.fundingButtonText}>Add funds</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {cleanupEligible && (
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

              <TouchableOpacity
                style={[
                  styles.cleanupButton,
                  cleanupActionBusy && styles.cleanupButtonDisabled,
                ]}
                onPress={beginCleanupClaim}
                disabled={cleanupActionBusy}
                accessibilityRole="button"
                accessibilityLabel="Clean Up"
              >
                {cleanupActionBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="hand-left-outline" size={21} color="#FFFFFF" />
                    <Text style={styles.cleanupButtonText}>Clean Up</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

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
                      <ActivityIndicator color="#A33A32" />
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


      {selectedReportIsShareable ? (
        <View style={styles.reportShareBar}>
          <TouchableOpacity
            style={styles.reportShareButton}
            onPress={() => setReportShareSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={selectedReport?.cleanup_state === 'completed'
              ? 'Share completed cleanup'
              : 'Share litter report'}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            <Text style={styles.reportShareButtonText}>{reportShareActionLabel(selectedReport)}</Text>
          </TouchableOpacity>
        </View>
      ) : null}


      {/* ============================= */}
      {/* Persistent Footer             */}
      {/* ============================= */}

      <View style={styles.reportFooter}>


        {/* WITHDRAW — signed-in owner only */}
        {canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at && (

          <TouchableOpacity
            style={[
              styles.reportFooterButton,
              styles.reportDeleteButton,
            ]}
            onPress={() => {

              Alert.alert(
                'Withdraw report?',
                'This removes the report from the map and report lists. It cannot be undone.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Withdraw',
                    style: 'destructive',

                    onPress: async () => {

                      try {
                        await withdrawOwnReport(selectedReport.id);
                        removeReport(selectedReport.id);
                        setDetailsOpen(false);
                        setSelectedReport(null);
                        Alert.alert(
                          'Report withdrawn',
                          'The report is no longer visible on the map or in report lists.'
                        );
                      } catch (error) {
                        Alert.alert(
                          'Couldn’t withdraw report',
                          reportWithdrawalErrorMessage(error)
                        );
                      }
                    },
                  },
                ]
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Withdraw report"
          >

            <Ionicons
              name="trash-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.reportDeleteButtonText}>
              Withdraw
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
              color="#FFFFFF"
            />

            <Text style={styles.reportEditButtonText}>
              Edit
            </Text>

          </TouchableOpacity>
        )}


        {/* CLOSE — everyone */}
        <TouchableOpacity
          style={[
            styles.reportFooterButton,
            styles.reportCloseButton,
          ]}
          onPress={() => setDetailsOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close report"
        >

          <Ionicons
            name="close-outline"
            size={20}
            color="#374151"
          />

          <Text style={styles.reportCloseButtonText}>
            Close
          </Text>

        </TouchableOpacity>

      </View>

    </View>

    <ReportShareSheet
      visible={reportShareSheetOpen && detailsOpen && selectedReportIsShareable}
      report={selectedReport}
      previewPhotoUrl={reportPhotoUrls[0] ?? null}
      busyAction={reportShareBusyAction}
      onInstagramStory={shareSelectedReportToInstagram}
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

wizardPhotoButton: {
  minHeight: 190,
  borderRadius: 20,
  borderWidth: 2,
  borderStyle: 'dashed',
  borderColor: '#A5D6A7',
  backgroundColor: '#F1F8E9',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
},

wizardPhotoIcon: {
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
},

wizardPhotoButtonTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: '#2F7D32',
},

wizardPhotoHelper: {
  marginTop: 5,
  fontSize: 13,
  color: '#667085',
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

replacePhotoButton: {
  minHeight: 46,
  marginTop: 18,
  paddingHorizontal: 18,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  backgroundColor: '#2F7D32',
},

replacePhotoButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '800',
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

wizardNotesInput: {
  minHeight: 120,
  paddingTop: 14,
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
  flex: 1,
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


/* Main vertical report scroll */

reportPostScrollContent: {
  paddingTop: 72,
  paddingBottom: 125,
},

reportPostScrollContentShareable: {
  paddingBottom: 200,
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
  fontSize: 30,
  lineHeight: 36,
  fontWeight: '800',
  color: '#1F2937',
  marginBottom: 18,
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
  backgroundColor: '#E3F1E4',
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

fundingCard: {
  marginBottom: 18,
  padding: 18,
  borderWidth: 1,
  borderColor: '#9CCB9F',
  borderRadius: 18,
  backgroundColor: '#EAF6EB',
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

fundingTitle: {
  color: '#37633B',
  fontSize: 13,
  fontWeight: '900',
  letterSpacing: 0.7,
  textTransform: 'uppercase',
},

fundingAmount: {
  marginTop: 5,
  color: '#245F2A',
  fontSize: 22,
  fontWeight: '900',
},

fundingText: {
  marginTop: 6,
  color: '#537056',
  fontSize: 14,
  lineHeight: 20,
},

fundingButton: {
  minHeight: 48,
  marginTop: 15,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 13,
  backgroundColor: '#2F7D32',
},

fundingButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '900',
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
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '#2F7D32',
},

cleanupButtonDisabled: {
  opacity: 0.6,
},

cleanupButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
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
  position: 'absolute',
  zIndex: 3,
  elevation: 3,
  bottom: 0,
  left: 0,
  right: 0,
  flexDirection: 'row',
  gap: 10,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 20,
  backgroundColor: '#FFFFFF',
  borderTopWidth: 1,
  borderTopColor: 'rgba(0,0,0,0.08)',
},

reportShareBar: {
  position: 'absolute',
  zIndex: 2,
  elevation: 2,
  left: 0,
  right: 0,
  bottom: 85,
  paddingHorizontal: 16,
  paddingTop: 12,
  backgroundColor: '#FFFFFF',
},

reportShareButton: {
  minHeight: 50,
  borderRadius: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '#B448CF',
},

reportShareButtonText: {
  color: '#FFFFFF',
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
  backgroundColor: '#E57373',
},

reportDeleteButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '800',
},

reportEditButton: {
  backgroundColor: '#66BB6A',
},

reportEditButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '800',
},

reportCloseButton: {
  backgroundColor: '#F3F4F6',
  borderWidth: 1,
  borderColor: '#E5E7EB',
},

reportCloseButtonText: {
  color: '#374151',
  fontSize: 15,
  fontWeight: '800',
},


// Enlarged marker hit area and status-colored icon wrap.
reportMarkerHitLg: {
  width: 88,          // was 44
  height: 88,         // was 44
  borderRadius: 44,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.01)', // keeps touch target reliable
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
  width: 60,          // was ~30
  height: 60,         // was ~30
  borderRadius: 30,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#D32F2F',
  borderWidth: 3,     // slightly thicker for scale
  borderColor: '#fff',
  shadowColor: '#000',
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
  backgroundColor: '#fff',
  borderWidth: 2,
  borderColor: '#374151',
},
reportClusterHit: {
  width: 96,
  height: 80,
  borderRadius: 40,
  alignItems: 'center',
  justifyContent: 'center',
  paddingBottom: 12,
  backgroundColor: 'rgba(0,0,0,0.01)',
},
reportClusterBubble: {
  width: 52,
  height: 52,
  borderRadius: 26,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#B448CF',
  borderWidth: 3,
  borderColor: '#fff',
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,
},
reportClusterText: {
  color: '#fff',
  fontSize: 17,
  fontWeight: '800',
},
reportClusterStatusRow: {
  position: 'absolute',
  bottom: 0,
  flexDirection: 'row',
  gap: 3,
},
reportClusterStatusBadge: {
  minWidth: 27,
  height: 20,
  borderRadius: 10,
  paddingHorizontal: 4,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff',
  borderWidth: 2,
},
reportClusterStatusCount: {
  fontSize: 10,
  fontWeight: '900',
  lineHeight: 12,
},
savingOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(255,255,255,0.55)',
  zIndex: 999,
},



});
