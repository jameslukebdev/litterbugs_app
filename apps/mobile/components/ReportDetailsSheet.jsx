import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CompletedCleanupStory from '../CompletedCleanupStory';
import ReportPhotoGallery from './ReportPhotoGallery';
import ReporterIdentity from '../ReporterIdentity';
import ReportShareSheet from '../ReportShareSheet';
import { LoadingButtonContent } from '../BrandedLoadingState';
import { formatUsd } from '../lib/funding';
import { reportShareActionLabel } from '../lib/reportSharing';
import { getLitterTypeIcon, getSiteConditionIcon } from '../lib/reportOptionIcons';
import { getSeveritySelectionColors } from '../lib/severitySelectionColors';
import { withdrawOwnReport, reportWithdrawalErrorMessage } from '../lib/reportWithdrawal';
import styles from '../styles/MapScreen.styles';
const formatFriendlyDateTime = value => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// The map owns report operations; this component owns the detail presentation.
export default function ReportDetailsSheet({ state, actions }) {
  const { detailsOpen, reportShareSheetOpen, reportShareBusyAction, selectedReport, insets, reportDetailsPreparing, selectedReportHasUtilityActions, completedCleanupImpact, completedCleanupImpactLoading, completedCleanupImpactError, reportHeroWidth, currentUserId, reportPhotoUrls, photosLoading, geminiReviewEnabled, userOwnsSelectedReport, reportFundingFeedback, cleanupDiscoverable, cleanupStatus, currentUserIsCleaner, selectedCleanupAttempt, cleanupAttemptLoading, cleanupActionBusy, canEditOrDeleteSelectedReport, selectedReportCanOpenFunding, payoutGateBusy, selectedReportIsShareable } = state;
  const { setReportShareSheetOpen, closeReportDetails, setDetailsOpen, setSelectedReport, navigation, setCompletedCleanupImpact, setCompletedCleanupImpactError, setCompletedCleanupImpactLoading, setCompletedCleanupImpactReloadKey, openCleanupNavigation, openCleanupSubmission, confirmCleanupRelease, openCleanupFeedback, openCleanupReview, beginCleanupClaim, openFundingContribution, removeReport, setForm, setEditingReportId, setIsEditing, setDraftCoord, resetReportWizard, setFormOpen, shareSelectedReport, shareSelectedReportToInstagram, editReportPhotos } = actions;
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
              <Text style={styles.originalReportEyebrow}>BEFORE THE CLEANUP</Text>
              <Text style={styles.originalReportTitle}>Original litter report</Text>
            </View>
          </>
        ) : null}

        {/* ============================= */}
        {/* Report Header                 */}
        {/* ============================= */}

        <View style={[
          styles.reportPostHeader,
          selectedReport?.cleanup_state === 'completed'
            ? styles.reportPostHeaderCompleted
            : styles.reportPostHeaderRegular,
        ]}>

          {selectedReport?.cleanup_state === 'completed' ? <View style={styles.reportIdentityCard}>
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
          </View> : null}

          <Text style={[
            styles.reportPostTitle,
            selectedReport?.cleanup_state !== 'completed' && styles.reportPostTitleRegular,
          ]}>
            {selectedReport?.title || 'Litter Report'}
          </Text>

          <View style={styles.reportRewardDirectionsRow}>
            <View style={[styles.rewardBadge, { marginBottom: 0 }]}>
              <Ionicons
                name={Number(selectedReport?.funded_amount_cents) > 0 ? 'cash-outline' : 'heart'}
                size={18}
                color={Number(selectedReport?.funded_amount_cents) > 0 ? '#FFFFFF' : '#E13B3B'}
              />
              <Text style={styles.rewardBadgeText}>
                {Number(selectedReport?.funded_amount_cents) > 0
                  ? `${formatUsd(Number(selectedReport.funded_amount_cents))} Cleanup Reward`
                  : 'Volunteer Opportunity'}
              </Text>
            </View>
          </View>

          {selectedReport?.cleanup_state === 'completed' && selectedReport?.severity ? (() => {
            const severityIndex = Math.max(0, ['Low', 'Medium', 'High'].indexOf(selectedReport.severity));
            const severityColors = getSeveritySelectionColors(severityIndex);
            return (
              <View style={[
                styles.reportSeverityPill,
                {
                  backgroundColor: severityColors.backgroundColor,
                  borderColor: severityColors.borderColor,
                },
              ]}>
                <Ionicons
                  name={selectedReport.severity === 'High'
                    ? 'warning-outline'
                    : selectedReport.severity === 'Low' ? 'leaf-outline' : 'trash-outline'}
                  size={17}
                  color={severityColors.foregroundColor}
                />
                <Text style={[styles.reportSeverityText, { color: severityColors.foregroundColor }]}>
                  {selectedReport.severity} Severity
                </Text>
              </View>
            );
          })() : null}

          {selectedReport?.cleanup_state !== 'completed' ? <View style={styles.reportIdentityCard}>
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
          </View> : null}

          {selectedReport?.cleanup_state === 'completed' ? <View style={[
            styles.reportMetaStack,
            styles.reportMetaStackCompleted,
          ]}>
            {selectedReport?.created_at ? (
              <View style={styles.reportMetaItem}>
                <Ionicons name="time-outline" size={17} color="#667085" />
                <View>
                  <Text style={styles.reportMetaItemLabel}>Reported</Text>
                  <Text style={styles.reportMetaItemText}>{formatFriendlyDateTime(selectedReport.created_at)}</Text>
                </View>
              </View>
            ) : null}
          </View> : null}

        </View>

        {selectedReport?.cleanup_state !== 'completed' ? (
          <ReportPhotoGallery report={selectedReport} urls={reportPhotoUrls} loading={photosLoading} width={reportHeroWidth} />
        ) : null}

        {selectedReport?.cleanup_state !== 'completed' && selectedReport?.severity ? (() => {
          const severityIndex = Math.max(0, ['Low', 'Medium', 'High'].indexOf(selectedReport.severity));
          const severityColors = getSeveritySelectionColors(severityIndex);
          return (
            <View style={[
              styles.reportSeverityPill,
              styles.reportSeverityBelowPhoto,
              {
                backgroundColor: severityColors.backgroundColor,
                borderColor: severityColors.borderColor,
              },
            ]}>
              <Ionicons
                name={selectedReport.severity === 'High'
                  ? 'warning-outline'
                  : selectedReport.severity === 'Low' ? 'leaf-outline' : 'trash-outline'}
                size={17}
                color={severityColors.foregroundColor}
              />
              <Text style={[styles.reportSeverityText, { color: severityColors.foregroundColor }]}>
                {selectedReport.severity} Severity
              </Text>
            </View>
          );
        })() : null}

        {selectedReport?.cleanup_state !== 'completed' ? (
          <View style={[
            styles.reportMetaStack,
            styles.reportMetaStackCompact,
            styles.reportMetaStackBelowPhoto,
            selectedReport?.severity && styles.reportMetaStackAfterSeverity,
          ]}>
            {selectedReport?.created_at ? (
              <View style={styles.reportMetaItem}>
                <Ionicons name="time-outline" size={17} color="#667085" />
                <View>
                  <Text style={styles.reportMetaItemLabel}>Reported</Text>
                  <Text style={styles.reportMetaItemText}>{formatFriendlyDateTime(selectedReport.created_at)}</Text>
                </View>
              </View>
            ) : null}
            {selectedReport?.expires_at ? (
              <View style={styles.reportMetaItem}>
                <Ionicons name="calendar-outline" size={17} color="#667085" />
                <View>
                  <Text style={styles.reportMetaItemLabel}>Expires</Text>
                  <Text style={styles.reportMetaItemText}>{new Date(selectedReport.expires_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ) : null}
          </View>
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

        {selectedReport?.cleanup_state === 'completed' ? (
          <View style={styles.beforePhotoHeading}>
            <Ionicons name="images-outline" size={20} color="#667085" />
            <Text style={styles.beforePhotoHeadingText}>Before cleanup</Text>
          </View>
        ) : null}

        {selectedReport?.cleanup_state === 'completed' ? (
          <ReportPhotoGallery report={selectedReport} urls={reportPhotoUrls} loading={photosLoading} width={reportHeroWidth} />
        ) : null}


        {/* ============================= */}
        {/* Main Report Information       */}
        {/* ============================= */}

        <View style={[
          styles.reportPostBody,
          selectedReport?.cleanup_state !== 'completed' && styles.reportPostBodyRegular,
        ]}>

          {(selectedReport?.litter_types?.length > 0 || selectedReport?.types) ? (
            <View style={[styles.reportPostSection, styles.reportInfoCard, styles.reportLitterInfoCard]}>
              <View style={styles.reportSectionHeader}>
                <Text style={styles.reportPostSectionTitle}>Litter Types</Text>
              </View>
              <View style={styles.reportChipRow}>
                {selectedReport?.litter_types?.map((type) => (
                  <View key={type} style={[styles.reportChip, styles.reportTypeChip]}>
                    <Ionicons name={getLitterTypeIcon(type)} size={16} color="#FFFFFF" />
                    <Text style={styles.reportChipText}>{type}</Text>
                  </View>
                ))}
                {selectedReport?.types ? (
                  <View style={[styles.reportChip, styles.reportOtherTypeChip]}>
                    <Ionicons name={getLitterTypeIcon(selectedReport.types)} size={16} color="#2F7D32" />
                    <Text style={styles.reportOtherTypeText}>{selectedReport.types}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {selectedReport?.notes_presets?.length > 0 ? (
            <View style={[styles.reportPostSection, styles.reportInfoCard, styles.reportConditionsInfoCard]}>
              <View style={styles.reportSectionHeader}>
                <Text style={styles.reportPostSectionTitle}>Site Conditions</Text>
              </View>
              <View style={styles.reportChipRow}>
                {selectedReport.notes_presets.map((note) => (
                  <View key={note} style={[styles.reportChip, styles.reportNoteChip]}>
                    <Ionicons name={getSiteConditionIcon(note)} size={16} color="#FFFFFF" />
                    <Text style={styles.reportChipText}>{note}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Additional descriptive information */}
          {selectedReport?.notes_other && (

            <View style={[styles.reportPostSection, styles.reportInfoCard, styles.reportDetailsInfoCard]}>

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
          accessibilityLabel="Claim Cleanup"
          accessibilityState={{ busy: cleanupActionBusy, disabled: cleanupActionBusy }}
        >
          <Text style={[styles.cleanupButtonText, { color: '#FFFFFF' }]}>Claim Cleanup</Text>
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
                <LoadingButtonContent label="Checking Stripe…" color="#66BB6A" />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={18} color="#66BB6A" />
                  <Text style={styles.reportFundButtonText}>Fund</Text>
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
              <Ionicons name="link-outline" size={18} color="#B448CF" />
              <Text style={styles.reportShareButtonText}>
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
