import { useEffect } from 'react';
import { Alert } from 'react-native';

import { trackParticipation, trackParticipationFailure } from './analytics';
import { acceptCleanupWaiver, claimCleanup, loadCurrentCleanupWaiver, releaseCleanup } from './cleanup';
import { cleanupActionMessage } from './cleanupEligibility';
import { loadPayoutStatus } from './funding';
import {
  PAYOUT_WORKFLOW_KIND,
  cleanupClaimRequiresPayoutSetup,
  consumePayoutWorkflow,
  isPayoutConnectionReady,
} from './payoutWorkflowGate';
import { promptCleanupNavigation } from './promptCleanupNavigation';
import { userMessage } from './userMessage';

// What a person can do with a cleanup from the report sheet: fund it, claim it
// (safety waiver, confirmation, payout setup when the cleanup is paid), open the
// submission, review and feedback screens, and release a claim. The state these
// handlers read and set stays in MapScreen; the code is moved out unchanged.
export default function useCleanupFlow(screen) {
  const {
    claimConfirmationQueued,
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
    setClaimConfirmationQueued,
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
  } = screen;

  const openFundingContribution = async ({ reportId }) => {
    if (!reportId || payoutGateBusy) return;
    trackParticipation('fund', 'action_tapped');

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
      trackParticipation('clean', 'claim_confirmed');

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
        trackParticipationFailure('clean', 'claim_confirmed', 'claim_failed');
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
      'Confirm this site is safe for you',
      "I can legally access this site and clean safely with my equipment, away from moving traffic and hazardous materials. I'll stop if conditions become unsafe. I have 24 hours to clean and submit photos.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I can clean safely',
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
    trackParticipation('clean', 'action_tapped');

    try {
      setCleanupActionBusy(true);
      const waiverStatus = await loadCurrentCleanupWaiver(currentUserId);
      setCleanupWaiver(waiverStatus.waiver);
      trackParticipation('clean', 'safety_review');
      if (waiverStatus.accepted) {
        setClaimConfirmationQueued(true);
      } else {
        setCleanupWaiverQueued(true);
        setDetailsOpen(false);
      }
    } catch (error) {
      trackParticipationFailure('clean', 'safety_review', 'safety_load_failed');
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

  const openCleanupNavigation = () => promptCleanupNavigation(selectedReport);

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

  return {
    openFundingContribution,
    beginCleanupClaim,
    acceptWaiverAndContinue,
    openCleanupNavigation,
    openCleanupSubmission,
    openCleanupReview,
    openCleanupFeedback,
    confirmCleanupRelease,
  };
}
