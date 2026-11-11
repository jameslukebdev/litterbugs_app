import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Keyboard, Linking, Platform } from 'react-native';

import { acknowledgeCleanupNotifications, loadUnreadCleanupNotifications } from './cleanup';
import { createCleanupNotificationPrompt } from './cleanupNotificationPrompt';
import { loadCleanupFeatureFlags, loadReportFundingFeedback } from './funding';

// Small pieces of MapScreen that each own their state and need nothing else from
// the screen. The effects are moved out unchanged.

// Whether the keyboard is up while the report form is open, and how tall it is.
export function useReportKeyboard(formOpen) {
  const [reportKeyboardVisible, setReportKeyboardVisible] = useState(false);
  const [reportKeyboardHeight, setReportKeyboardHeight] = useState(0);

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

  return { reportKeyboardVisible, reportKeyboardHeight };
}

// "Preparing photos" only appears once preparation has run for a moment.
export function usePhotoPreparationNotice(photoPreparationStatus) {
  const [showPhotoPreparation, setShowPhotoPreparation] = useState(false);
  const isPreparingPhotos = Boolean(photoPreparationStatus?.startsWith('Preparing'));
  useEffect(() => {
    setShowPhotoPreparation(false);
    if (!isPreparingPhotos) return undefined;
    const timer = setTimeout(() => setShowPhotoPreparation(true), 400);
    return () => clearTimeout(timer);
  }, [isPreparingPhotos]);

  return { showPhotoPreparation, isPreparingPhotos };
}

// Whether cleanup payments and photo review are switched on.
export function useCleanupFeatureFlags() {
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [geminiReviewEnabled, setGeminiReviewEnabled] = useState(false);

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

  return { paymentsEnabled, geminiReviewEnabled };
}

// The photo-review feedback shown to a reporter whose report cannot be funded yet.
export function useReportFundingFeedback({ geminiReviewEnabled, currentUserId, selectedReport }) {
  const [reportFundingFeedback, setReportFundingFeedback] = useState(null);

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

  return reportFundingFeedback;
}

// Checks for unread cleanup updates on open, every minute and when the app
// returns to the foreground, and offers to open them.
export function useCleanupNoticePrompt({ currentUserId, refreshReports, navigation }) {
  const cleanupNoticeCheckInFlight = useRef(false);
  const cleanupNoticePromptState = useRef(null);

  useEffect(() => {
    if (!currentUserId) return undefined;

    let active = true;
    if (cleanupNoticePromptState.current?.owner !== currentUserId) {
      cleanupNoticePromptState.current = { owner: currentUserId, shown: new Set(), pending: false };
    }
    const prompt = createCleanupNotificationPrompt({
      state: cleanupNoticePromptState.current,
      isCurrent: () => active,
      present: (...args) => Alert.alert(...args),
      acknowledge: acknowledgeCleanupNotifications,
      open: async destination => {
        if (destination.url) await Linking.openURL(destination.url);
        else {
          const parent = navigation.getParent();
          if (!parent) throw new Error('Navigation is not ready.');
          parent.navigate(destination.name, destination.params);
        }
      },
      onError: () => Alert.alert('Update remains unread', 'The update could not be opened or marked read. Check your connection and try again.'),
    });

    const checkCleanupNotices = async () => {
      if (cleanupNoticeCheckInFlight.current) return;

      try {
        cleanupNoticeCheckInFlight.current = true;
        const notices = await loadUnreadCleanupNotifications();
        if (!active || notices.length === 0) return;

        // Unread historical events are not the current task state. Refresh from
        // the account before presenting; never navigate or acknowledge on display.
        await refreshReports({ showRefresh: false });
        if (active) prompt.show(notices);
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
  }, [currentUserId, refreshReports, navigation]);
}
