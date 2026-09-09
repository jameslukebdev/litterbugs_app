import { reportPresentation } from '../lib/reportPresentation';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Linking, Alert } from 'react-native';
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
  const { setReportShareSheetOpen, closeReportDetails, setDetailsOpen, setSelectedReport, setPreviewId, navigation, commitMapRegion, setCompletedCleanupImpact, setCompletedCleanupImpactError, setCompletedCleanupImpactLoading, setCompletedCleanupImpactReloadKey, openCleanupNavigation, openCleanupSubmission, confirmCleanupRelease, openCleanupFeedback, openCleanupReview, beginCleanupClaim, openFundingContribution, removeReport, setForm, setEditingReportId, setIsEditing, setDraftCoord, resetReportWizard, setFormOpen, shareSelectedReport } = actions;
  return (<Modal
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

          {selectedReport?.cleanup_state !== 'completed' ? <View style={styles.rewardBadge}>
            <Ionicons
              name={Number(selectedReport?.funded_amount_cents) > 0 ? 'cash-outline' : 'heart-outline'}
              size={18}
              color="#245F2A"
            />
            <Text style={styles.rewardBadgeText}>
              {reportPresentation(selectedReport).funding}
            </Text>
          </View> : null}

          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Get directions to this cleanup" onPress={() => Linking.openURL(`https://maps.apple.com/?daddr=${selectedReport.latitude},${selectedReport.longitude}`).catch(() => Alert.alert('Directions unavailable', 'Please try again.'))} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#2F7D32', fontWeight: '700' }}>Get directions ↗</Text></TouchableOpacity>

          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 15, color: '#30363B', lineHeight: 22 }}>{[...(selectedReport?.litter_types || []), selectedReport?.types].filter(Boolean).join(' · ')}</Text>
            {selectedReport?.notes_presets?.length ? <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 21, color: '#805C00' }}>{selectedReport.notes_presets.join(' · ')}</Text> : null}
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

          <Text style={{ color: '#687178', fontSize: 13, lineHeight: 20, marginTop: 12 }}>
            {selectedReport?.created_at ? `Reported ${formatFriendlyDateTime(selectedReport.created_at)}` : ''}
            {selectedReport?.expires_at && selectedReport?.cleanup_state !== 'completed' ? ` · Expires ${new Date(selectedReport.expires_at).toLocaleDateString()}` : ''}
          </Text>
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
</Modal>);
}
