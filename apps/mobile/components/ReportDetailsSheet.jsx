import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CompletedCleanupStory from '../CompletedCleanupStory';
import ReportPhotoGallery from './ReportPhotoGallery';
import { FlowDoneHost, showFlowDone } from './FlowDone';
import BrandBug from './BrandBug';
import LoadingBee from './LoadingBee';
import SlideUp from './SlideUp';
import CompactRankBadge from '../CompactRankBadge';
import ProfileAvatar from '../ProfileAvatar';
import { reportStatePresentation } from '../lib/reportState';
import ReportShareSheet from '../ReportShareSheet';
import { LoadingButtonContent } from '../BrandedLoadingState';
import { formatUsd } from '../lib/funding';
import { withdrawOwnReport, reportWithdrawalErrorMessage } from '../lib/reportWithdrawal';
import styles from '../styles/MapScreen.styles';
import { hapticTap } from '../lib/haptics';
import { colors } from '../lib/theme';
// Website severity words: green, orange, red.
const SEVERITY_INK = { Low: colors.green, Medium: colors.yellow, High: colors.red };
const formatShortDate = value => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// The map owns report operations; this component owns the detail presentation.
export default function ReportDetailsSheet({ state, actions }) {
  const { detailsOpen, reportShareSheetOpen, reportShareBusyAction, selectedReport, insets, reportDetailsPreparing, selectedReportHasUtilityActions, completedCleanupImpact, completedCleanupImpactLoading, completedCleanupImpactError, reportHeroWidth, currentUserId, reportPhotoUrls, photosLoading, geminiReviewEnabled, userOwnsSelectedReport, reportFundingFeedback, cleanupDiscoverable, cleanupStatus, currentUserIsCleaner, selectedCleanupAttempt, cleanupAttemptLoading, cleanupActionBusy, canEditOrDeleteSelectedReport, selectedReportCanOpenFunding, payoutGateBusy, selectedReportIsShareable, isFavorite, favoritesReady, isHidden } = state;
  const { setReportShareSheetOpen, closeReportDetails, setDetailsOpen, setSelectedReport, navigation, setCompletedCleanupImpact, setCompletedCleanupImpactError, setCompletedCleanupImpactLoading, setCompletedCleanupImpactReloadKey, openCleanupNavigation, openCleanupSubmission, confirmCleanupRelease, openCleanupFeedback, openCleanupReview, beginCleanupClaim, openFundingContribution, removeReport, setForm, setEditingReportId, setIsEditing, setDraftCoord, resetReportWizard, setFormOpen, shareSelectedReport, shareSelectedReportLink, shareSelectedReportToInstagram, editReportPhotos, toggleFavorite, toggleHidden } = actions;
  const editSelectedReport = () => editReportPhotos(selectedReport);
  const confirmDeleteReport = () => {

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
                        showFlowDone({ bug: 'dragonfly', title: 'Report deleted', text: 'It’s off the map and report lists.' });
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
  };
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  // Active Android reports start the photo at 72dp; inset its controls by 12dp.
  const reportControlsTop = Platform.OS === 'android' && selectedReport?.cleanup_state !== 'completed'
    ? Math.max(insets.top + 20, 84)
    : insets.top + 20;
  useEffect(() => { setOwnerMenuOpen(false); }, [detailsOpen, selectedReport?.id]);
  const showOwnerActions = () => {
    if (!canEditOrDeleteSelectedReport || selectedReport?.funding_locked_at) return;
    setOwnerMenuOpen(value => !value);
  };
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  useEffect(() => { setFeedbackExpanded(false); }, [detailsOpen, selectedReport?.id, reportFundingFeedback?.user_summary, selectedReport?.funding_eligibility]);
  const [showClaimSpinner, setShowClaimSpinner] = useState(false);
  useEffect(() => {
    if (!cleanupActionBusy || !detailsOpen) {
      setShowClaimSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowClaimSpinner(true), 400);
    return () => clearTimeout(timer);
  }, [cleanupActionBusy, detailsOpen]);
  // The cleanup status card. For the member doing the cleanup it is the next step,
  // so it sits right under the title; for everyone else it stays lower down.
  const cleanupCard = cleanupStatus && selectedReport?.cleanup_state !== 'completed' ? (
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
                  {selectedReport?.cleanup_state === 'claimed' ? <BrandBug kind="caterpillar" size={34} /> : (
                    <Ionicons
                      name={cleanupStatus.icon}
                      size={24}
                      color={cleanupStatus.tone === 'completed' ? colors.primary : colors.yellow}
                    />
                  )}
                </View>
                <View style={styles.cleanupProgressCopy}>
                  <Text
                    style={[
                      styles.cleanupProgressTitle,
                      cleanupStatus.tone === 'completed' && styles.cleanupCompleteStatusTitle,
                    ]}
                  >
                    {selectedReport?.cleanup_state === 'claimed' && currentUserIsCleaner ? 'You’re cleaning this one' : cleanupStatus.title}
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
                      ? `Clean it and send your after photos by ${new Date(selectedCleanupAttempt.claim_expires_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`
                      : cleanupStatus.description}
                  </Text>
                </View>
              </View>

              {selectedReport?.cleanup_state === 'claimed' && cleanupAttemptLoading ? (
                <View style={styles.cleanupProgressLoading}>
                  <ActivityIndicator color={colors.yellow} />
                  <Text style={styles.cleanupProgressLoadingText}>Checking cleanup details…</Text>
                </View>
              ) : cleanupStatus.showClaimActions ? (
                <View style={styles.cleanupActionStack}>
                  {/* One clear next step first; directions second; giving up is a quiet link. */}
                  <TouchableOpacity
                    style={[styles.cleanupActionButton, styles.cleanupNavigateButton]}
                    onPress={openCleanupSubmission}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="I cleaned it, add after photos"
                  >
                    <Ionicons name="camera-outline" size={20} color={colors.white} />
                    <Text style={styles.cleanupPrimaryActionText}>I cleaned it – add after photos</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cleanupActionButton, styles.cleanupCompleteButton]}
                    onPress={openCleanupNavigation}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Get directions to this cleanup"
                  >
                    <Ionicons name="navigate-outline" size={20} color={colors.primary} />
                    <Text style={styles.cleanupSecondaryActionText}>Get directions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cleanupGiveUpLink}
                    onPress={confirmCleanupRelease}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Can’t do it? Give this cleanup back"
                  >
                    {cleanupActionBusy ? (
                      <LoadingButtonContent label="Giving it back…" color={colors.red} />
                    ) : (
                      <Text style={styles.cleanupGiveUpText}>Can’t do it? <Text style={styles.cleanupGiveUpAction}>Give this cleanup back</Text></Text>
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
                    <Ionicons name="document-text-outline" size={20} color={colors.yellow} />
                    <Text style={styles.cleanupFeedbackActionText}>Review Feedback</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cleanupActionButton, styles.cleanupCompleteButton]}
                    onPress={openCleanupSubmission}
                    disabled={cleanupActionBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Update Submission"
                  >
                    <Ionicons name="camera-outline" size={20} color={colors.primary} />
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
                    <Ionicons name="images-outline" size={20} color={colors.primary} />
                    <Text style={styles.cleanupSecondaryActionText}>Review Cleanup</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
  ) : null;
  const cleanupCardFirst = selectedReport?.cleanup_state === 'claimed' && currentUserIsCleaner;

  return (<Modal
  visible={detailsOpen}
  animationType="fade"
  transparent
  onRequestClose={() => {
    if (ownerMenuOpen) { setOwnerMenuOpen(false); return; }
    if (reportShareSheetOpen && !reportShareBusyAction) {
      setReportShareSheetOpen(false);
      return;
    }
    if (!reportShareBusyAction) closeReportDetails();
  }}
>
  <View style={styles.modalBackdrop}>
    <SlideUp open={Boolean(detailsOpen)} style={styles.reportSheet} distance={80}>
      {/* This sheet covers the app's banner host, so it carries its own. */}
      <FlowDoneHost />

      {/* A solid bar behind the top buttons, so the report scrolls under it instead of through them. */}
      <View pointerEvents="none" style={[styles.reportTopBar, { height: reportControlsTop + 54 }]} />
      {/* Website toolbar: "Back to map" on the left; heart, share and hide on the right. */}
      <TouchableOpacity onPress={closeReportDetails} accessibilityRole="button" accessibilityLabel="Back to map" style={[styles.reportBackControl, { top: reportControlsTop }]}>
        <Ionicons name="chevron-back" size={20} color={colors.ink} />
        <Text style={styles.reportBackText}>Back to map</Text>
      </TouchableOpacity>
      {selectedReportIsShareable ? (
        <TouchableOpacity
          onPress={() => setReportShareSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={selectedReport?.cleanup_state === 'completed' ? 'Share completed cleanup' : 'Share litter report'}
          style={[styles.reportPhotoControl, styles.reportPhotoShareControl, { top: reportControlsTop }]}
        >
          <Ionicons name="share-outline" size={20} color={colors.ink} />
        </TouchableOpacity>
      ) : null}

      {/* Website report sheet: hide, share and the heart sit together in the top bar. */}
      {favoritesReady && selectedReport?.id ? (
        <TouchableOpacity
          onPress={() => { toggleHidden(selectedReport.id); if (!isHidden) closeReportDetails(); }}
          accessibilityRole="button"
          accessibilityLabel={isHidden ? 'Show this report again' : 'Hide this report'}
          style={[styles.reportPhotoControl, styles.reportPhotoHideControl, { top: reportControlsTop }]}
        >
          <Ionicons name={isHidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.ink} />
        </TouchableOpacity>
      ) : null}

      {favoritesReady && selectedReport?.id ? (
        <TouchableOpacity
          onPress={() => { hapticTap(); toggleFavorite(selectedReport.id); }}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          accessibilityState={{ selected: Boolean(isFavorite) }}
          style={[styles.reportPhotoControl, styles.reportPhotoFavoriteControl, { top: reportControlsTop }, !selectedReportIsShareable && styles.reportPhotoShareControl]}
        >
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? colors.severityHigh : colors.ink} />
        </TouchableOpacity>
      ) : null}

      {reportDetailsPreparing && !selectedReport ? (
        <View
          style={styles.reportDetailsLoadingOverlay}
          accessibilityRole="progressbar"
          accessibilityLabel="Loading report"
          accessibilityLiveRegion="polite"
        >
          <TouchableOpacity
            style={[styles.reportDetailsLoadingClose, { top: insets.top + 12 }]}
            onPress={closeReportDetails}
            accessibilityRole="button"
            accessibilityLabel="Close report"
          >
            <Ionicons name="close-outline" size={24} color={colors.ink} />
          </TouchableOpacity>
          <LoadingBee label="Loading report" message={selectedReport?.cleanup_state === 'completed' ? 'Loading completed report…' : 'Loading report…'} />
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
        {selectedReport?.cleanup_state === 'completed' && completedCleanupImpactLoading && !completedCleanupImpact ? (
          <LoadingBee label="Loading cleanup" message="Loading cleanup…" />
        ) : <>
        {selectedReport?.cleanup_state === 'completed' ? (
          <>
            <CompletedCleanupStory
              impact={completedCleanupImpact}
              loading={completedCleanupImpactLoading}
              error={completedCleanupImpactError}
              photoWidth={reportHeroWidth}
              beforePhotos={<ReportPhotoGallery report={selectedReport} urls={reportPhotoUrls} loading={photosLoading} width={reportHeroWidth} />}
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
            </View>
          </>
        ) : null}

        {/* ============================= */}
        {/* Report Header                 */}
        {/* ============================= */}

        {/* Website report sheet header (apps/web components/report-detail.tsx): title, then the
            state's bug and words, the bee's fund line, and a quiet line with a priority dot. */}
        {(() => {
          const state = reportStatePresentation(selectedReport);
          const closed = Boolean(selectedReport?.cancelled_at || selectedReport?.expired_at);
          const cleanupState = selectedReport?.cleanup_state;
          const statusText = closed ? 'Report closed'
            : cleanupState === 'claimed' ? 'Cleanup in progress'
            : cleanupState === 'completion_submitted' ? 'Cleanup photos under review'
            : cleanupState === 'changes_requested' ? 'Cleaner is updating photos'
            : cleanupState === 'completed' ? 'Cleanup complete'
            : 'Available to clean';
          const severityWord = selectedReport?.severity ? `${String(selectedReport.severity).charAt(0).toUpperCase()}${String(selectedReport.severity).slice(1).toLowerCase()}` : 'Medium';
          const funded = Number(selectedReport?.funded_amount_cents) > 0;
          return (
            <View style={[styles.reportPostHeader, styles.websiteReportHeader, completedCleanupImpact?.afterPhotoUrls?.length > 0 && cleanupState === 'completed' && { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={[styles.reportPostTitle, styles.websiteReportTitle]} accessibilityRole="header">{selectedReport?.title || 'Litter Report'}</Text>
              <View style={styles.websiteReportState}>
                {!closed && state.bug ? <BrandBug kind={state.bug} size={18} /> : null}
                <Text style={[styles.websiteReportStateText, { color: closed ? colors.muted : state.ink }]}>{statusText}</Text>
              </View>
              {!closed && cleanupState !== 'completed' && funded ? (
                <View style={styles.websiteReportState}>
                  <BrandBug kind="bee" size={18} />
                  <Text style={[styles.websiteReportStateText, { color: colors.yellow }]}>{formatUsd(Number(selectedReport.funded_amount_cents))} in its cleanup fund</Text>
                </View>
              ) : null}
              {cleanupCardFirst && selectedCleanupAttempt?.claim_expires_at ? (
                <Text style={styles.cleanerDeadline}>You’re cleaning this one. Send your after photos by {new Date(selectedCleanupAttempt.claim_expires_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.</Text>
              ) : null}
              <View style={styles.websiteReportMeta}>
                <View style={styles.websiteReportSeverity}>
                  <View style={[styles.websiteReportSeverityDot, { backgroundColor: SEVERITY_INK[severityWord] || SEVERITY_INK.Medium }]} />
                  <Text style={[styles.websiteReportSeverityText, { color: SEVERITY_INK[severityWord] || SEVERITY_INK.Medium }]}>{severityWord} priority</Text>
                </View>
                {selectedReport?.created_at ? <Text style={styles.websiteReportFacts}>Reported {formatShortDate(selectedReport.created_at)}</Text> : null}
                {!closed && cleanupState === 'available' && selectedReport?.expires_at ? <Text style={styles.websiteReportFacts}>Open until {formatShortDate(selectedReport.expires_at)}</Text> : null}
              </View>
            </View>
          );
        })()}

        {selectedReport?.cleanup_state !== 'completed' ? (
          <ReportPhotoGallery report={selectedReport} urls={reportPhotoUrls} loading={photosLoading} width={reportHeroWidth} />
        ) : null}

        {/* Website report sheet: directions sit right under the photos. */}
        {selectedReport?.cleanup_state !== 'completed' && !selectedReport?.cancelled_at && !selectedReport?.expired_at && !(selectedReport?.cleanup_state === 'claimed' && currentUserIsCleaner) ? (
          <TouchableOpacity style={styles.reportDirectionsButton} onPress={openCleanupNavigation} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Get directions to this report">
            <Ionicons name="locate-outline" size={19} color={colors.primaryDark} />
            <Text style={styles.reportDirectionsText}>Get directions</Text>
          </TouchableOpacity>
        ) : null}

        {geminiReviewEnabled
          && userOwnsSelectedReport
          && selectedReport?.cleanup_state === 'available'
          && selectedReport?.renewal_status === 'active'
          && selectedReport?.funding_eligibility !== 'eligible' ? (
          <View style={[styles.fundingFeedbackCard, styles.reportFeedbackBelowPhoto]}>
            <Ionicons
              name={selectedReport?.funding_eligibility === 'better_photos'
                ? 'camera-outline'
                : selectedReport?.funding_eligibility === 'ineligible'
                  ? 'alert-circle-outline'
                  : 'time-outline'}
              size={23}
              color={colors.yellow}
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
              {selectedReport?.funding_eligibility === 'better_photos' ? <Text style={styles.fundingFeedbackText}>Add clear photos showing the reported litter.</Text> : null}
              {selectedReport?.funding_eligibility !== 'better_photos' || feedbackExpanded ? <Text style={styles.fundingFeedbackText}>
                {reportFundingFeedback?.user_summary
                  || selectedReport?.funding_hold_reason
                  || (selectedReport?.funding_eligibility === 'better_photos'
                    ? 'Edit this report to replace its original photos.'
                    : 'Report saved. Volunteers can still help while this check finishes. Return to this report to see the latest review status.')}
              </Text> : null}
              {selectedReport?.funding_eligibility === 'better_photos' ? (
                <View style={styles.fundingFeedbackActions}>
                  <TouchableOpacity style={styles.fundingFeedbackAction} onPress={() => setFeedbackExpanded(value => !value)} accessibilityRole="button" accessibilityState={{ expanded: feedbackExpanded }}>
                    <Text style={styles.fundingFeedbackActionText}>{feedbackExpanded ? 'Hide details' : 'View details'}</Text>
                    <Ionicons name={feedbackExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.yellow} />
                  </TouchableOpacity>
                  {canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at ? <TouchableOpacity style={styles.fundingFeedbackAction} onPress={editSelectedReport} accessibilityRole="button" accessibilityLabel="Edit report photos">
                    <Ionicons name="camera-outline" size={16} color={colors.yellow} />
                    <Text style={styles.fundingFeedbackActionText}>Edit photos</Text>
                  </TouchableOpacity> : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* The story above carries the After cleanup / Before switch. Only when it has no
            after photos to switch with do the original photos sit here on their own. */}
        {selectedReport?.cleanup_state === 'completed' && !(completedCleanupImpact?.afterPhotoUrls?.length > 0) ? (
          <>
            <View style={styles.beforePhotoHeading}>
              <Ionicons name="images-outline" size={20} color={colors.muted} />
              <Text style={styles.beforePhotoHeadingText}>Before cleanup</Text>
            </View>
            <ReportPhotoGallery report={selectedReport} urls={reportPhotoUrls} loading={photosLoading} width={reportHeroWidth} />
          </>
        ) : null}


        {/* ============================= */}
        {/* Main Report Information       */}
        {/* ============================= */}

        <View style={[
          styles.reportPostBody,
          (selectedReport?.cleanup_state !== 'completed' || completedCleanupImpact?.afterPhotoUrls?.length > 0) && styles.reportPostBodyRegular,
        ]}>

          {/* Website report sheet body: Litter, Notes and Details as label-over-value facts,
              then "Reported by" with the reporter's card. */}
          {(() => {
            const conditions = (selectedReport?.notes_presets || []).filter(Boolean);
            const litter = [...(selectedReport?.litter_types || []), selectedReport?.types].filter(Boolean);
            const reporter = selectedReport?.reporter;
            const openReporter = reporter?.id ? () => {
              setDetailsOpen(false);
              if (reporter.id === currentUserId) navigation.navigate('Profile');
              else navigation.getParent()?.navigate('PublicProfile', { profileId: reporter.id, sourceReportId: selectedReport.id });
            } : undefined;
            return (
              <View style={styles.websiteAbout}>
                {[['Litter', litter.join(', ')], ['Notes', conditions.join(', ')], ['Details', selectedReport?.notes_other]].filter(([, value]) => value).map(([label, value]) => (
                  <View key={label} style={styles.websiteFact}>
                    <Text style={styles.websiteFactLabel}>{label}</Text>
                    <Text style={styles.websiteAboutText}>{value}</Text>
                  </View>
                ))}
                {reporter?.id ? (
                  <View style={styles.websiteByline}>
                    <Text style={styles.websiteBylineLabel}>Reported by</Text>
                    <TouchableOpacity
                      style={styles.websiteReporterRow}
                      onPress={openReporter}
                      activeOpacity={0.72}
                      accessibilityRole="button"
                      accessibilityLabel={`Reported by ${reporter.display_name || 'a member'}. View profile`}
                    >
                      <ProfileAvatar profile={reporter} size={36} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.websiteReporterName} numberOfLines={1}>{reporter.display_name || 'Community member'}</Text>
                        <CompactRankBadge userId={reporter.id} appearance="plain" />
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })()}


          {cleanupCardFirst ? null : cleanupCard}

          {userOwnsSelectedReport && (
            selectedReport?.funding_locked_at || !canEditOrDeleteSelectedReport
          ) ? (
            <View style={styles.ownerReportLockCard}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
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

        </>}
      </ScrollView>

      {cleanupDiscoverable || selectedReportCanOpenFunding ? <View style={[styles.reportDetailActionFooter, { paddingBottom: canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at ? 4 : Math.max(insets.bottom, 12) }]}>
      {/* Website footer: Fund (bee, yellow) then Clean (butterfly, lilac), side by side. */}
      <View style={styles.reportActionRow}>
          {selectedReportCanOpenFunding ? (
            <TouchableOpacity
              style={[styles.reportActionButton, styles.reportFundButton]}
              onPress={() => openFundingContribution({ reportId: selectedReport.id })}
              disabled={payoutGateBusy}
              accessibilityRole="button"
              accessibilityLabel="Fund cleanup"
            >
              {payoutGateBusy ? (
                <LoadingButtonContent label="Checking Stripe…" color={colors.fundInk} />
              ) : (
                <>
                  <BrandBug kind="bee" size={21} />
                  <Text style={styles.reportFundButtonText}>Fund</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
          {cleanupDiscoverable ? (
            <TouchableOpacity
              style={[styles.reportActionButton, styles.reportCleanButton]}
              activeOpacity={1}
              onPress={beginCleanupClaim}
              disabled={cleanupActionBusy}
              accessibilityRole="button"
              accessibilityLabel="Clean up this report"
              accessibilityState={{ busy: cleanupActionBusy, disabled: cleanupActionBusy }}
            >
              <BrandBug kind="butterfly" size={21} />
              <Text style={styles.reportCleanButtonText}>Clean</Text>
              {cleanupActionBusy && showClaimSpinner ? (
                <View style={styles.reportDetailClaimSpinner} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <ActivityIndicator size="small" color={colors.cleanInk} />
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
      </View>
      </View> : null}

      {/* The cleaner's next steps live in the pinned bar, like Fund and Clean do. */}
      {cleanupCardFirst && cleanupStatus?.showClaimActions && !cleanupAttemptLoading ? (
        <View style={[styles.reportDetailActionFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.reportActionRow}>
            <TouchableOpacity
              style={[styles.reportActionButton, styles.cleanerDirectionsButton]}
              onPress={openCleanupNavigation}
              disabled={cleanupActionBusy}
              accessibilityRole="button"
              accessibilityLabel="Get directions to this cleanup"
            >
              <Ionicons name="navigate-outline" size={19} color={colors.primaryDark} />
              <Text style={styles.cleanerDirectionsText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reportActionButton, styles.cleanerDoneButton]}
              onPress={openCleanupSubmission}
              disabled={cleanupActionBusy}
              accessibilityRole="button"
              accessibilityLabel="I cleaned it, add after photos"
            >
              <Ionicons name="camera-outline" size={20} color={colors.white} />
              <Text style={styles.cleanerDoneText}>I cleaned it</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.cleanupGiveUpLink}
            onPress={confirmCleanupRelease}
            disabled={cleanupActionBusy}
            accessibilityRole="button"
            accessibilityLabel="Can’t do it? Give this cleanup back"
          >
            {cleanupActionBusy ? (
              <LoadingButtonContent label="Giving it back…" color={colors.red} />
            ) : (
              <Text style={styles.cleanupGiveUpText}>Can’t do it? <Text style={styles.cleanupGiveUpAction}>Give this cleanup back</Text></Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ============================= */}
      {/* Persistent Footer             */}
      {/* ============================= */}

      {canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at ? (
        <View style={[styles.reportOwnerFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.reportManageButton} onPress={showOwnerActions} accessibilityRole="button" accessibilityLabel="Manage your report" accessibilityState={{ expanded: ownerMenuOpen }}>
            <Ionicons name="options-outline" size={18} color={colors.muted} />
            <Text style={styles.reportManageText}>Manage report</Text>
            <Ionicons name="chevron-up" size={15} color={colors.muted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {ownerMenuOpen && canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at ? (
        <View style={styles.reportOwnerMenuOverlay} accessibilityViewIsModal onAccessibilityEscape={() => setOwnerMenuOpen(false)}>
          <TouchableOpacity style={styles.reportOwnerMenuBackdrop} activeOpacity={1} onPress={() => setOwnerMenuOpen(false)} accessibilityRole="button" accessibilityLabel="Dismiss report menu" />
          <View style={[styles.reportOwnerMenu, { bottom: Math.max(insets.bottom, 12) + 52 }]}>
            <TouchableOpacity style={styles.reportOwnerMenuItem} onPress={() => { setOwnerMenuOpen(false); editSelectedReport(); }} accessibilityRole="button" accessibilityLabel="Edit report">
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.reportOwnerMenuText}>Edit report</Text>
            </TouchableOpacity>
            <View style={styles.reportOwnerMenuDivider} />
            <TouchableOpacity style={styles.reportOwnerMenuItem} onPress={() => { setOwnerMenuOpen(false); confirmDeleteReport(); }} accessibilityRole="button" accessibilityLabel="Delete report">
              <Ionicons name="trash-outline" size={20} color={colors.red} />
              <Text style={[styles.reportOwnerMenuText, { color: colors.red }]}>Delete report</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SlideUp>

    <ReportShareSheet
      visible={reportShareSheetOpen && detailsOpen && selectedReportIsShareable}
      report={selectedReport}
      previewPhotoUrl={reportPhotoUrls[0] ?? null}
      busyAction={reportShareBusyAction}
      onSystemShare={shareSelectedReport}
      onLinkShare={shareSelectedReportLink}
      onInstagramStory={shareSelectedReportToInstagram}
      onClose={() => {
        if (!reportShareBusyAction) setReportShareSheetOpen(false);
      }}
    />
  </View>
</Modal>);
}
