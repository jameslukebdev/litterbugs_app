import { ActivityIndicator, Animated, Image, Keyboard, Modal, Platform, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import CloudDraftStatus from './CloudDraftStatus';
import ReportWizardSteps from './ReportWizardSteps';
import SlideUp from './SlideUp';
import { LITTER_OPTIONS, NOTES_OPTIONS, REPORT_STEPS } from '../lib/reportOptions';
import { colors } from '../lib/theme';
import styles from '../styles/MapScreen.styles';

// The report form sheet: saving overlay, header, the animated step page and the
// Back / Next footer. Layout moved out of MapScreen unchanged; MapScreen still
// owns the form's state and passes it in.
export default function ReportWizardModal(props) {
  const {
    beginReportAtCoordinate,
    canAdvanceFromStep,
    cancelDraft,
    changeDraftLocation,
    currentUserId,
    draftCoord,
    draftSaveError,
    form,
    formOpen,
    fundingEnabled,
    goToNextReportStep,
    goToPreviousReportStep,
    hasAttachedReportPhoto,
    hasStartingFundingChoice,
    isEditing,
    isPreparingPhotos,
    isSaving,
    isTransitioning,
    jumpToReportStep,
    photoPreparationStatus,
    pickImage,
    removePhoto,
    reportKeyboardHeight,
    reportKeyboardVisible,
    reportPhotoUrls,
    reportStep,
    reportStepPanResponder,
    reportWizardScrollRef,
    returnToReview,
    revealBottomReportField,
    saveStage,
    selectedReport,
    setForm,
    showPhotoPreparation,
    startingContributionCents,
    stepOpacity,
    stepTranslateX,
    submitReport,
    wantsStartingFunding,
  } = props;

  return (
    <Modal
      visible={formOpen}
      animationType="fade"
      transparent
      onRequestClose={cancelDraft}
    >
      <View style={styles.modalBackdrop}>
        <SlideUp open={Boolean(formOpen)} style={styles.wizardKeyboardView} distance={80}>
          <View style={styles.wizardSheet}>

            {isSaving && (
              <View
                style={styles.savingOverlay}
                pointerEvents="auto"
                accessibilityRole="progressbar"
                accessibilityLabel={saveStage}
              >
                <View style={styles.savingCard}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.savingTitle}>
                    Creating your report
                  </Text>
                  <Text style={styles.savingStatus}>{saveStage}</Text>

                </View>
              </View>
            )}


            {!isEditing && currentUserId ? <CloudDraftStatus userId={currentUserId} draftKey="report" onRestored={saved => { if(saved) beginReportAtCoordinate(saved.coordinate, saved.form, saved.step, saved.missingPhotoCount); }} /> : null}
            {!isEditing && draftSaveError ? <Text style={{ color: colors.red, paddingHorizontal: 20 }}>Draft could not be saved. Keep this screen open and try Save for later again.</Text> : null}
            {/* Persistent Header */}
            <View style={styles.wizardHeader}>

              {/* Website report form: the dragonfly beside the current step's name. */}
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Image source={require('../assets/bugs/dragonfly.png')} style={{ width: 30, height: 30 }} resizeMode="contain" accessible={false} />
                <Text style={styles.wizardHeaderTitle} accessibilityRole="header">
                  {['Add photos', 'Type of litter', 'Severity', 'Site conditions', isEditing ? 'Review changes' : 'Review report'][reportStep] || 'Report litter'}
                </Text>
                {reportStep === 3 ? <Text style={styles.optionalStepLabel}>Optional</Text> : null}


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
                  color={colors.ink}
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

              {/* Website footer: outlined Back (Cancel on the first step), step count with dots, purple Next. */}
              <TouchableOpacity
                style={[styles.wizardBackButton, (isTransitioning || isSaving) && { opacity: 0.5 }]}
                onPress={reportStep === 0 ? cancelDraft : goToPreviousReportStep}
                disabled={isTransitioning || isSaving || Boolean(photoPreparationStatus)}
                accessibilityRole="button"
                accessibilityLabel={reportStep === 0 ? 'Cancel report' : 'Previous report step'}
              >
                <Ionicons name="chevron-back" size={18} color={colors.ink} />
                <Text style={styles.wizardBackText}>{reportStep === 0 ? 'Cancel' : 'Back'}</Text>
              </TouchableOpacity>

              <View style={styles.wizardProgress}>
                <Text style={styles.wizardProgressText}>
                  Step {reportStep + 1} of {REPORT_STEPS.length}
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

              {/* The final step posts from the review screen, so it keeps the footer balanced instead. */}
              {reportStep < REPORT_STEPS.length - 1 ? (
                <TouchableOpacity
                  style={[styles.wizardNextButton, (!canAdvanceFromStep(reportStep) || isTransitioning || isSaving || Boolean(photoPreparationStatus)) && styles.wizardNextButtonDisabled]}
                  onPress={goToNextReportStep}
                  disabled={!canAdvanceFromStep(reportStep) || isTransitioning || isSaving || Boolean(photoPreparationStatus)}
                  accessibilityRole="button"
                  accessibilityLabel={returnToReview ? "Return to review" : "Next report step"}
                >
                  <Text style={styles.wizardNextText}>{returnToReview ? 'Review' : 'Next'}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.white} />
                </TouchableOpacity>
              ) : <View style={styles.wizardNextSpacer} accessible={false} />}

              </View>
            )}
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
