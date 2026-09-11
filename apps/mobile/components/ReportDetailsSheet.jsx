import { useEffect, useState } from 'react';
import { reportPresentation } from '../lib/reportPresentation';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CompletedCleanupStory from '../CompletedCleanupStory';
import ReportPhotoGallery from './ReportPhotoGallery';
import ReporterIdentity from '../ReporterIdentity';
import ReportShareSheet from '../ReportShareSheet';
import { LoadingButtonContent } from '../BrandedLoadingState';
import { formatUsd } from '../lib/funding';
import { reportShareActionLabel } from '../lib/reportSharing';
import { withdrawOwnReport, reportWithdrawalErrorMessage } from '../lib/reportWithdrawal';
import styles from '../styles/MapScreen.styles';
const formatFriendlyDateTime = value => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// The map owns report operations; this component owns the detail presentation.
export default function ReportDetailsSheet({ state, actions }) {
  const { detailsOpen, reportShareSheetOpen, reportShareBusyAction, selectedReport, insets, region, reportDetailsPreparing, selectedReportHasUtilityActions, completedCleanupImpact, completedCleanupImpactLoading, completedCleanupImpactError, reportHeroWidth, currentUserId, reportPhotoUrls, photosLoading, geminiReviewEnabled, userOwnsSelectedReport, reportFundingFeedback, cleanupDiscoverable, cleanupStatus, currentUserIsCleaner, selectedCleanupAttempt, cleanupAttemptLoading, cleanupActionBusy, canEditOrDeleteSelectedReport, selectedReportCanOpenFunding, payoutGateBusy, selectedReportIsShareable } = state;
  const { setReportShareSheetOpen, closeReportDetails, setDetailsOpen, setSelectedReport, setPreviewId, navigation, commitMapRegion, setCompletedCleanupImpact, setCompletedCleanupImpactError, setCompletedCleanupImpactLoading, setCompletedCleanupImpactReloadKey, openCleanupNavigation, openCleanupSubmission, confirmCleanupRelease, openCleanupFeedback, openCleanupReview, beginCleanupClaim, openFundingContribution, removeReport, setForm, setEditingReportId, setIsEditing, setDraftCoord, resetReportWizard, setFormOpen, shareSelectedReport, shareSelectedReportToInstagram, editReportPhotos } = actions;
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
  return (<Modal
  visible={detailsOpen}
  animationType="slide"
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
    <View style={styles.reportSheet}>

      {selectedReport && Number.isFinite(selectedReport.latitude) && Number.isFinite(selectedReport.longitude) ? <TouchableOpacity
        accessibilityRole="button" accessibilityLabel="Show report on map"
        style={[styles.reportPhotoControl, styles.reportPhotoMapControl, { top: reportControlsTop }]}
        onPress={() => {
          const report = selectedReport;
          setDetailsOpen(false); setSelectedReport(null); setPreviewId(null);
          navigation.setParams({ reportId: undefined, returnTo: undefined });
          commitMapRegion({ ...region, latitude: report.latitude, longitude: report.longitude });
        }}><Ionicons name="map-outline" size={18} color="#285D38" /><Text style={styles.reportPhotoControlText}>Show on map</Text></TouchableOpacity> : null}

      <TouchableOpacity onPress={closeReportDetails} accessibilityRole="button" accessibilityLabel="Close report" style={[styles.reportPhotoControl, styles.reportPhotoCloseControl, { top: reportControlsTop }]}><Ionicons name="close" size={20} color="#30363B" /></TouchableOpacity>

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

      {selectedReport?.cleanup_state === 'completed' ? <View style={[styles.completedReportToolbar, { height: insets.top + 76 }]} /> : null}
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={[
          styles.reportPostScrollContent,
          selectedReport?.cleanup_state === 'completed' && { paddingTop: 0 },
          selectedReportHasUtilityActions && styles.reportPostScrollContentWithActions,
        ]}
      >
        {selectedReport?.cleanup_state === 'completed' && completedCleanupImpactLoading && !completedCleanupImpact ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Loading cleanup" style={{ minHeight: 220, backgroundColor: '#EDF2EE', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#2F7D32" />
            <Text style={{ marginTop: 12, color: '#64716A' }}>Loading cleanup…</Text>
          </View>
        ) : <>
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
              <Ionicons name="images-outline" size={21} color="#2F7D32" />
              <Text style={styles.originalReportTitle}>Before cleanup</Text>
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

          <View style={styles.reportRewardDirectionsRow}>
            {selectedReport?.cleanup_state !== 'completed' ? (
              <View style={styles.reportRewardSummary}>
                <Text style={styles.reportRewardAmount}>{Number(selectedReport?.funded_amount_cents) > 0 ? formatUsd(Number(selectedReport.funded_amount_cents)) : 'No funds yet'}</Text>
                <Text style={styles.reportRewardCaption}>Cleanup reward</Text>
              </View>
            ) : null}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Get directions to this cleanup"
              onPress={() => Linking.openURL(`https://maps.apple.com/?daddr=${selectedReport.latitude},${selectedReport.longitude}`).catch(() => Alert.alert('Directions unavailable', 'Please try again.'))}
              style={styles.reportDirectionsButton}>
              <Ionicons name="navigate-outline" size={18} color="#2F7D32" />
              <Text style={styles.reportDirectionsButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.reportDetailFacts}>
            {[...(selectedReport?.litter_types || []), selectedReport?.types].filter(Boolean).length ? (
              <View style={styles.reportDetailFactRow}>
                <Ionicons name="trash-outline" size={20} color="#637067" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                <Text style={styles.reportDetailFactText}>{[...(selectedReport?.litter_types || []), selectedReport?.types].filter(Boolean).join(' · ')}</Text>
              </View>
            ) : null}
            {selectedReport?.notes_presets?.length ? (
              <View style={styles.reportDetailFactRow}>
                <Ionicons name="location-outline" size={20} color="#637067" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                <Text style={styles.reportDetailFactText}>{selectedReport.notes_presets.join(' · ')}</Text>
              </View>
            ) : null}
          </View>
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
                      <Ionicons name={feedbackExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#754B13" />
                    </TouchableOpacity>
                    {canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at ? <TouchableOpacity style={styles.fundingFeedbackAction} onPress={editSelectedReport} accessibilityRole="button" accessibilityLabel="Edit report photos">
                      <Ionicons name="camera-outline" size={16} color="#754B13" />
                      <Text style={styles.fundingFeedbackActionText}>Edit photos</Text>
                    </TouchableOpacity> : null}
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.reportDetailReporter}>
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

          </View>
          <View style={styles.reportDetailDates}>
            {selectedReport?.created_at ? (
              <View style={styles.reportDetailMetadataRow}>
                <Text style={styles.reportDetailMetadataLabel}>Reported</Text>
                <Text style={styles.reportDetailMetadataValue}>{formatFriendlyDateTime(selectedReport.created_at)}</Text>
              </View>
            ) : null}
            {selectedReport?.expires_at && selectedReport?.cleanup_state !== 'completed' ? (
              <View style={styles.reportDetailMetadataRow}>
                <Text style={styles.reportDetailMetadataLabel}>Expires</Text>
                <Text style={styles.reportDetailMetadataValue}>
                  {new Date(selectedReport.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            ) : null}
            {selectedReport?.severity ? (
              <View style={styles.reportDetailMetadataRow}>
                <Text style={styles.reportDetailMetadataLabel}>Severity</Text>
                <View style={[
                  styles.reportDetailSeverityBadge,
                  selectedReport.severity === 'Medium' && styles.reportDetailSeverityMedium,
                  selectedReport.severity === 'High' && styles.reportDetailSeverityHigh,
                ]}>
                  <Ionicons
                    name={selectedReport.severity === 'High' ? 'warning-outline' : selectedReport.severity === 'Low' ? 'leaf-outline' : 'trash-outline'}
                    size={16}
                    color={selectedReport.severity === 'High' ? '#9B3030' : selectedReport.severity === 'Medium' ? '#805900' : '#2F7D32'}
                  />
                  <Text style={[
                    styles.reportDetailSeverityValue,
                    selectedReport.severity === 'Medium' && { color: '#805900' },
                    selectedReport.severity === 'High' && { color: '#9B3030' },
                  ]}>{selectedReport.severity}</Text>
                </View>
              </View>
            ) : null}
          </View>

        </View>


        {/* ============================= */}
        {/* Main Report Information       */}
        {/* ============================= */}

        <View style={styles.reportPostBody}>


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
                  <Ionicons name="time-outline" size={22} color="#687178" />
                </View>
                <View style={styles.cleanupEligibilityCopy}>
                  <Text style={styles.cleanupEligibilityTitle}>24-hour cleanup claim</Text>
                  <Text style={styles.cleanupEligibilityText}>
                    Review and accept the safety acknowledgment each time you claim a report.
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

        </>}
      </ScrollView>

      {cleanupDiscoverable || selectedReportHasUtilityActions ? <View style={[styles.reportDetailActionFooter, { paddingBottom: canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at ? 4 : Math.max(insets.bottom, 12) }]}>
      {cleanupDiscoverable ? (
        <TouchableOpacity
          style={[styles.cleanupButton, styles.reportDetailPrimaryAction]}
          activeOpacity={1}
          onPress={beginCleanupClaim}
          disabled={cleanupActionBusy}
          accessibilityRole="button"
          accessibilityLabel="Help clean this up"
          accessibilityState={{ busy: cleanupActionBusy, disabled: cleanupActionBusy }}
        >
          <Text style={[styles.cleanupButtonText, { color: '#FFFFFF' }]}>Help clean this up</Text>
          {cleanupActionBusy && showClaimSpinner ? (
            <View style={styles.reportDetailClaimSpinner} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}
      {selectedReportHasUtilityActions ? (
        <View style={[styles.reportUtilityBar, styles.reportDetailUtilityRow]}>
          {selectedReportCanOpenFunding ? (
            <TouchableOpacity
              style={[styles.reportUtilityButton, styles.reportFundButton, styles.reportDetailSecondaryAction]}
              onPress={() => openFundingContribution({ reportId: selectedReport.id })}
              disabled={payoutGateBusy}
              accessibilityRole="button"
              accessibilityLabel="Fund cleanup"
            >
              {payoutGateBusy ? (
                <LoadingButtonContent label="Checking Stripe…" color="#2F7D32" />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={18} color="#4F5C63" />
                  <Text style={[styles.reportFundButtonText, { color: '#4F5C63', fontWeight: '600' }]}>Fund</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {selectedReportIsShareable ? (
            <TouchableOpacity
              style={[styles.reportUtilityButton, styles.reportShareButton, styles.reportDetailSecondaryAction]}
              onPress={() => setReportShareSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={selectedReport?.cleanup_state === 'completed'
                ? 'Share completed cleanup'
                : 'Share litter report'}
            >
              <Ionicons name="share-outline" size={18} color="#4F5C63" />
              <Text style={[styles.reportShareButtonText, { color: '#4F5C63', fontWeight: '600' }]}>
                {reportShareActionLabel(selectedReport)}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}


      </View> : null}

      {/* ============================= */}
      {/* Persistent Footer             */}
      {/* ============================= */}

      {canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at ? (
        <View style={[styles.reportOwnerFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.reportManageButton} onPress={showOwnerActions} accessibilityRole="button" accessibilityLabel="Manage your report" accessibilityState={{ expanded: ownerMenuOpen }}>
            <Ionicons name="options-outline" size={18} color="#687178" />
            <Text style={styles.reportManageText}>Manage report</Text>
            <Ionicons name="chevron-up" size={15} color="#687178" />
          </TouchableOpacity>
        </View>
      ) : null}

      {ownerMenuOpen && canEditOrDeleteSelectedReport && !selectedReport?.funding_locked_at ? (
        <View style={styles.reportOwnerMenuOverlay} accessibilityViewIsModal onAccessibilityEscape={() => setOwnerMenuOpen(false)}>
          <TouchableOpacity style={styles.reportOwnerMenuBackdrop} activeOpacity={1} onPress={() => setOwnerMenuOpen(false)} accessibilityRole="button" accessibilityLabel="Dismiss report menu" />
          <View style={[styles.reportOwnerMenu, { bottom: Math.max(insets.bottom, 12) + 52 }]}>
            <TouchableOpacity style={styles.reportOwnerMenuItem} onPress={() => { setOwnerMenuOpen(false); editSelectedReport(); }} accessibilityRole="button" accessibilityLabel="Edit report">
              <Ionicons name="create-outline" size={20} color="#2F7D32" />
              <Text style={styles.reportOwnerMenuText}>Edit report</Text>
            </TouchableOpacity>
            <View style={styles.reportOwnerMenuDivider} />
            <TouchableOpacity style={styles.reportOwnerMenuItem} onPress={() => { setOwnerMenuOpen(false); confirmDeleteReport(); }} accessibilityRole="button" accessibilityLabel="Delete report">
              <Ionicons name="trash-outline" size={20} color="#B23B3B" />
              <Text style={[styles.reportOwnerMenuText, { color: '#B23B3B' }]}>Delete report</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>

    <ReportShareSheet
      visible={reportShareSheetOpen && detailsOpen && selectedReportIsShareable}
      report={selectedReport}
      previewPhotoUrl={reportPhotoUrls[0] ?? null}
      busyAction={reportShareBusyAction}
      onSystemShare={shareSelectedReport}
      onInstagramStory={shareSelectedReportToInstagram}
      onClose={() => {
        if (!reportShareBusyAction) setReportShareSheetOpen(false);
      }}
    />
  </View>
</Modal>);
}
