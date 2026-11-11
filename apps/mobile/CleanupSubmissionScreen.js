import { usePreventRemove } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import CloudDraftStatus from './components/CloudDraftStatus';
import { trackParticipation, trackParticipationFailure } from './lib/analytics';
import { cloudDrafts } from './lib/cloudDrafts';
import { loadCleanupDraft, saveCleanupDraft, clearCleanupDraft } from './lib/savedCleanupDraft';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandedLoadingState, { LoadingButtonContent } from './BrandedLoadingState';
import LoadingBee from './components/LoadingBee';
import { hapticSuccess } from './lib/haptics';
import { showFlowDone } from './components/FlowDone';
import { EmptyState, ErrorText, SecondaryButton, TextLink } from './components/ui';

import {
  chooseCleanupPhotos,
  loadCleanupSubmissionContext,
  uploadCleanupSubmission,
} from './lib/cleanupSubmission';
import {
  MAX_CLEANUP_DESCRIPTION_LENGTH,
  MAX_CLEANUP_PHOTOS,
  validateCleanupSubmission,
} from './lib/cleanupSubmissionValidation';
import useFocusedResource from './lib/useFocusedResource';
import { cleanupLoadErrorPresentation } from './lib/cleanupLoadError';
import { permanentUserId } from './lib/reportAccess';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import { colors, fonts } from './lib/theme';

const submissionErrorMessage = (error) => {
  const message = error?.message ?? '';
  if (/cleanup_claim_expired/i.test(message)) {
    return 'This cleanup claim expired before the evidence was submitted.';
  }
  if (/cleanup_correction_expired/i.test(message)) {
    return 'The 24-hour update window expired. This report is available for another volunteer.';
  }
  if (/cleanup_submission_(not_allowed|invalid_state)/i.test(message)) {
    return 'This cleanup is no longer available for submission.';
  }
  if (/cleanup_photo|mime|image|photo safety|photo could not|selected photo|5 MB/i.test(message)) {
    return message;
  }
  return 'Check your connection and try submitting again.';
};

function LoadingState() {
  return <LoadingBee label="Opening cleanup" style={{ backgroundColor: colors.white }} />;
}

function CleanupPhoto({ photo, index, review = false, onRemove }) {
  const [loading, setLoading] = useState(true);
  return (
    <View style={review ? styles.reviewPhotoWrap : styles.photoWrap}>
      <ExpoImage
        source={{ uri: photo.uri }}
        contentFit="cover"
        cachePolicy="none"
        transition={160}
        style={review ? styles.reviewPhoto : styles.photo}
        onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
        accessibilityLabel={`After-cleanup ${review ? 'review ' : ''}photo ${index + 1}`}
      />
      {loading ? (
        <View style={styles.photoLoading} accessibilityLabel={`Loading photo ${index + 1}`}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {!review ? (
        <TouchableOpacity
          style={styles.removePhoto}
          onPress={() => onRemove(index)}
          accessibilityRole="button"
          accessibilityLabel={`Remove cleanup photo ${index + 1}`}
        >
          <Ionicons name="close" size={18} color={colors.white} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function CleanupSubmissionScreen({ navigation, route }) {
  const cleanupId = route?.params?.cleanupId;
  const { user } = useSession();
  const userId = permanentUserId(user);
  const { refreshReports } = useReports();
  const insets = useSafeAreaInsets();
  const contextResource = useFocusedResource(useCallback(() => {
    if (!cleanupId || !userId) throw new Error('cleanup_submission_not_allowed');
    return loadCleanupSubmissionContext(cleanupId, userId);
  }, [cleanupId, userId]));
  const { data: context, loading, error: loadError } = contextResource;
  const [step, setStep] = useState('form');
  useEffect(() => { trackParticipation('clean', 'evidence_form'); }, []);
  const [photos, setPhotos] = useState([]);
  const [description, setDescription] = useState('');
  const [bagsOrItemsRemoved, setBagsOrItemsRemoved] = useState('');
  const [weightPounds, setWeightPounds] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({
    stage: 'preparing',
    current: 1,
    total: 1,
  });
  const [exitAction, setExitAction] = useState(null);
  const [missingPhotoCount, setMissingPhotoCount] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [draftLoadError, setDraftLoadError] = useState(false);
  const [draftRestoreAttempt, setDraftRestoreAttempt] = useState(0);
  const submissionId = useRef(Crypto.randomUUID());
  const submitted = useRef(false);
  const draftOwner = useRef(null);
  const latestDraft = useRef(null);
  latestDraft.current = { photos, description, bagsOrItemsRemoved, weightPounds, submissionId: submissionId.current, correctionDueAt: context?.attempt?.correction_due_at ?? null };

  useEffect(() => {
    let active = true;
    draftOwner.current = null;
    setDraftReady(false);
    setDraftLoadError(false);
    submitted.current = false;
    if (!userId || !cleanupId || !context?.attempt) return;
    loadCleanupDraft(userId, cleanupId, context.attempt.correction_due_at ?? null).then(draft => {
      if (!active) return;
      submissionId.current = draft?.submissionId || Crypto.randomUUID();
      setPhotos([]); setDescription(''); setBagsOrItemsRemoved(''); setWeightPounds('');
      draftOwner.current = `${userId}:${cleanupId}`;
      setMissingPhotoCount(draft?.missingPhotoCount || 0);
      if (draft) {
        setPhotos(draft.photos); setDescription(draft.description);
        setBagsOrItemsRemoved(draft.bagsOrItemsRemoved || ''); setWeightPounds(draft.weightPounds || '');
        if (draft.submissionId) submissionId.current = draft.submissionId;
        setDraftStatus('Draft restored');
      }
    }).catch(() => { if (active) { setDraftLoadError(true); setDraftStatus('Couldn’t restore the saved draft'); } })
      .finally(() => { if (active) setDraftReady(true); });
    return () => { active = false; };
  }, [userId, cleanupId, draftRestoreAttempt, context?.attempt?.id, context?.attempt?.correction_due_at]);

  useEffect(() => {
    if (!draftReady || submitted.current || !userId || !cleanupId || draftOwner.current !== `${userId}:${cleanupId}`) return;
    let active = true;
    const timer = setTimeout(() => saveCleanupDraft(userId, cleanupId, latestDraft.current)
      .then(() => { if (active) setDraftStatus('Draft saved on this device'); })
      .catch(() => { if (active) setDraftStatus('Draft not saved — keep this screen open and try again'); }), 500);
    return () => { active = false; clearTimeout(timer); };
  }, [draftReady, userId, cleanupId, photos, description, bagsOrItemsRemoved, weightPounds]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' && draftReady && !submitted.current && draftOwner.current === `${userId}:${cleanupId}`) {
        saveCleanupDraft(userId, cleanupId, latestDraft.current).catch(() => setDraftStatus('Draft not saved — keep this screen open and try again'));
      }
    });
    return () => subscription.remove();
  }, [draftReady, userId, cleanupId]);

  usePreventRemove(draftReady && !submitted.current && Boolean(photos.length || description || bagsOrItemsRemoved || weightPounds) && !exitAction, ({ data }) => {
    saveCleanupDraft(userId, cleanupId, latestDraft.current)
      .then(() => setExitAction(data.action))
      .catch(() => Alert.alert('Couldn’t save draft', 'Keep this screen open and try again.'));
  });
  useEffect(() => { if (exitAction) navigation.dispatch(exitAction); }, [exitAction, navigation]);

  const saveAndExit = async () => {
    try {
      await saveCleanupDraft(userId, cleanupId, latestDraft.current);
      navigation.goBack();
    } catch { Alert.alert('Couldn’t save draft', 'Keep this screen open and try again.'); }
  };

  const submissionScrollRef = useRef(null);
  const submissionScrollOffsetRef = useRef(0);
  const descriptionInputRef = useRef(null);
  const bagsInputRef = useRef(null);
  const weightInputRef = useRef(null);

  const revealCleanupEntryField = (inputRef) => {
    const keyboardAnimationDelay = Platform.OS === 'ios' ? 320 : 120;
    setTimeout(() => {
      const keyboardFrame = Keyboard.metrics();
      if (!keyboardFrame || !inputRef.current) return;

      inputRef.current.measureInWindow((_screenX, screenY, _width, height) => {
        const overlap = screenY + height + 16 - keyboardFrame.screenY;
        if (overlap <= 0) return;

        submissionScrollRef.current?.scrollTo({
          y: Math.max(submissionScrollOffsetRef.current + overlap, 0),
          animated: true,
        });
      });
    }, keyboardAnimationDelay);
  };

  const addPhotos = async (source) => {
    if (submitting || photos.length >= MAX_CLEANUP_PHOTOS) return;

    try {
      const selected = await chooseCleanupPhotos(
        source,
        MAX_CLEANUP_PHOTOS - photos.length
      );
      if (selected.length > 0) {
        setPhotos((current) => [...current, ...selected].slice(0, MAX_CLEANUP_PHOTOS));
        setErrors((current) => ({ ...current, photos: undefined }));
      }
    } catch (error) {
      console.log('Cleanup photo picker error:', error);
      Alert.alert('Couldn’t open photos', 'Try again or check the app’s permissions in Settings.');
    }
  };

  const removePhoto = (index) => {
    if (submitting) return;
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const currentValidation = () => validateCleanupSubmission({
    photos,
    description,
    bagsOrItemsRemoved,
    weightPounds,
  });

  const continueToReview = () => {
    const validation = currentValidation();
    setErrors(validation.errors);
    if (!validation.valid) return;
    Keyboard.dismiss();
    setStep('review');
  };

  const submit = async () => {
    if (submitting || !context) return;
    const validation = currentValidation();
    setErrors(validation.errors);
    if (!validation.valid) {
      setStep('form');
      return;
    }

    try {
      setSubmitting(true);
      setSubmissionProgress({ stage: 'preparing', current: 1, total: photos.length });
      await saveCleanupDraft(userId, cleanupId, latestDraft.current);
      submissionId.current = await cloudDrafts.begin(userId, `cleanup:${cleanupId}`);
      const result = await uploadCleanupSubmission({
        submissionId: submissionId.current,
        cleanupId: context.attempt.id,
        userId,
        photos,
        isPaid: context.attempt.is_paid,
        onProgress: setSubmissionProgress,
        ...validation.normalized,
      });
      submitted.current = true;
      trackParticipation('clean', 'evidence_submitted');
      await clearCleanupDraft(userId, cleanupId).catch(() => {});
      await refreshReports({ showRefresh: false }).catch(() => {});

      const aiDecision = result.aiReview?.ai;
      const paidMessage = aiDecision?.status === 'better_photos'
        ? aiDecision.summary
        : aiDecision?.status === 'passed'
          ? 'Your photos passed review. The reporter can approve the cleanup now or dispute it within 48 hours.'
          : aiDecision?.status === 'admin_review'
            ? 'A Litterbugs team member is reviewing the photos. Your payout is paused, and we’ll contact you if we need anything.'
            : 'Your photos are being reviewed. The 48-hour dispute window starts only after they pass.';

      if (aiDecision?.status === 'better_photos') {
        Alert.alert(
          'Better photos needed',
          context.attempt.is_paid ? paidMessage : 'Please review the feedback and send clearer photos.',
          [{ text: 'Review feedback', onPress: () => navigation.replace('CleanupFeedback', { cleanupId: context.attempt.id }) }],
          { cancelable: false }
        );
      } else {
        // Website finish: land back on the report with the "Photos sent" banner.
        hapticSuccess();
        showFlowDone({
          bug: 'flower',
          title: 'Photos sent',
          text: context.attempt.is_paid ? paidMessage : 'Cleanup submitted. The reporter has 48 hours to review it.',
        });
        navigation.navigate('App', { screen: 'Map', params: { reportId: context.attempt.report_id } });
      }
    } catch (error) {
      console.log('Cleanup submission error:', error);
      trackParticipationFailure('clean', 'evidence_submitted', 'evidence_submit_unconfirmed');
      Alert.alert('Couldn’t submit cleanup', submissionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if ((loading && !context) || (!draftReady && userId && cleanupId)) return <LoadingState />;

  if (loadError || !context) {
    const recovery = cleanupLoadErrorPresentation(loadError);
    return (
      <View style={styles.centerState}>
        <EmptyState icon={<Ionicons name="alert-circle-outline" size={40} color={colors.red} />} title="Cleanup unavailable" text={recovery.message} action={recovery.retryable ? { label: 'Retry cleanup', onPress: contextResource.refresh } : null} />
        <TextLink label="Go back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  if (draftLoadError) return <View style={styles.centerState}>
    <EmptyState icon={<Ionicons name="alert-circle-outline" size={40} color={colors.red} />} title="Couldn’t restore your draft" text="Retry before adding evidence so your saved draft is not replaced." action={{ label: 'Retry saved draft', onPress: () => setDraftRestoreAttempt(attempt => attempt + 1) }} />
    <TextLink label="Go back" onPress={() => navigation.goBack()} />
  </View>;

  const reportTitle = context.report?.title || 'Litter cleanup';
  const normalized = currentValidation().normalized;
  const isCorrection = context.attempt.status === 'changes_requested';
  const correctionDeadline = isCorrection
    ? new Date(context.attempt.correction_due_at).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    : null;
  // Website cleanup flow: the deadline sits under the step's heading.
  const sendByValue = isCorrection ? context.attempt.correction_due_at : context.attempt.claim_expires_at;
  const sendBy = sendByValue && Number.isFinite(Date.parse(sendByValue))
    ? new Date(sendByValue).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;
  const submissionTitle = submissionProgress.stage === 'preparing'
    ? 'Preparing cleanup photos…'
    : submissionProgress.stage === 'uploading'
      ? 'Uploading cleanup photos…'
      : submissionProgress.stage === 'reviewing'
        ? 'Reviewing cleanup photos…'
        : 'Saving your cleanup…';
  const submissionMessage = ['preparing', 'uploading'].includes(submissionProgress.stage)
    ? `Photo ${submissionProgress.current} of ${submissionProgress.total}. Keep Litterbugs open while this finishes.`
    : submissionProgress.stage === 'reviewing'
      ? 'Running the safety review before the cleanup moves forward.'
      : 'Finishing the cleanup record for your community.';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Modal visible={submitting} animationType="fade" statusBarTranslucent>
        <BrandedLoadingState working title={submissionTitle} message={submissionMessage} />
      </Modal>
      <ScrollView
        ref={submissionScrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScroll={({ nativeEvent }) => {
          submissionScrollOffsetRef.current = nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {draftReady && !submitted.current ? <CloudDraftStatus userId={userId} draftKey={`cleanup:${cleanupId}`} onRestored={() => setDraftRestoreAttempt(value => value + 1)} /> : null}
        {!submitted.current ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {missingPhotoCount > 0 ? <Text style={{ color: colors.yellow, marginBottom: 8 }}>{missingPhotoCount} saved {missingPhotoCount === 1 ? 'photo is' : 'photos are'} no longer on this device. Add replacement photos before submitting. Your other answers were kept.</Text> : null}
          <Text accessibilityLiveRegion="polite" style={{ flex: 1, color: colors.muted, fontSize: 12 }}>{draftStatus}</Text>
          <TouchableOpacity accessibilityRole="button" disabled={submitting} onPress={saveAndExit} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Save and exit</Text></TouchableOpacity>
        </View> : null}
        {/* Website cleanup flow header: the caterpillar beside the step's question and the report. */}
        <View style={styles.flowHead}>
          <Image source={require('./assets/bugs/caterpillar.png')} style={styles.flowBug} resizeMode="contain" accessible={false} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} accessibilityRole="header">
              {step === 'form'
                ? (isCorrection ? 'Update your cleanup photos' : 'Show what you cleaned')
                : 'Ready to send?'}
            </Text>
            <Text style={styles.reportTitle}>{reportTitle}</Text>
            {sendBy ? <Text style={styles.reportTitle}>Send by {sendBy}</Text> : null}
          </View>
        </View>

        {isCorrection && step === 'form' ? (
          <View style={styles.correctionNotice}>
            <Ionicons name="time-outline" size={21} color={colors.yellow} />
            <View style={styles.correctionNoticeCopy}>
              <Text style={styles.correctionNoticeTitle}>Changes requested</Text>
              <Text style={styles.correctionNoticeText}>Resubmit by {correctionDeadline}.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CleanupFeedback', { cleanupId })}>
                <Text style={styles.feedbackLink}>Review reporter feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {step === 'form' ? (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>1  Add after photos</Text>
                <Text style={styles.required}>Required · {photos.length}/{MAX_CLEANUP_PHOTOS}</Text>
              </View>
              <Text style={styles.helper}>
                1 to 3 photos. Try to stand where the reporter did.
              </Text>

              {photos.length > 0 ? (
                <View style={styles.photoGrid}>
                  {photos.map((photo, index) => (
                    <CleanupPhoto key={`${photo.uri}-${index}`} photo={photo} index={index} onRemove={removePhoto} />
                  ))}
                </View>
              ) : null}

              {photos.length < MAX_CLEANUP_PHOTOS ? (
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.photoButton} onPress={() => addPhotos('camera')}>
                    <Ionicons name="camera-outline" size={20} color={colors.primary} />
                    <Text style={styles.photoButtonText}>Take photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoButton} onPress={() => addPhotos('library')}>
                    <Ionicons name="images-outline" size={20} color={colors.primary} />
                    <Text style={styles.photoButtonText}>Choose photos</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <ErrorText style={styles.error}>{errors.photos}</ErrorText>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>2  What did you clean up?</Text>
                <Text style={styles.required}>Required</Text>
              </View>
              <TextInput selectionColor={colors.primary}
                ref={descriptionInputRef}
                style={[styles.descriptionInput, errors.description && styles.inputError]}
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  setErrors((current) => ({ ...current, description: undefined }));
                }}
                placeholder="Describe what you removed and where you cleaned."
                multiline
                maxLength={MAX_CLEANUP_DESCRIPTION_LENGTH}
                textAlignVertical="top"
                editable={!submitting}
                onFocus={() => revealCleanupEntryField(descriptionInputRef)}
                accessibilityLabel="Cleanup description"
              />
              <Text style={styles.characterCount}>
                {description.length}/{MAX_CLEANUP_DESCRIPTION_LENGTH}
              </Text>
              <ErrorText style={styles.error}>{errors.description}</ErrorText>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>3  How much?</Text>
                <Text style={styles.required}>Optional</Text>
              </View>
              <View style={styles.numericRow}>
                <View style={styles.numericField}>
                  <Text style={styles.inputLabel}>Bags or items</Text>
                  <TextInput selectionColor={colors.primary}
                    ref={bagsInputRef}
                    style={[styles.numericInput, errors.bagsOrItemsRemoved && styles.inputError]}
                    value={bagsOrItemsRemoved}
                    onChangeText={(value) => {
                      setBagsOrItemsRemoved(value);
                      setErrors((current) => ({ ...current, bagsOrItemsRemoved: undefined }));
                    }}
                    placeholder="2"
                    keyboardType="number-pad"
                    maxLength={4}
                    editable={!submitting}
                    onFocus={() => revealCleanupEntryField(bagsInputRef)}
                  />
                  <ErrorText style={styles.error}>{errors.bagsOrItemsRemoved}</ErrorText>
                </View>
                <View style={styles.numericField}>
                  <Text style={styles.inputLabel}>Weight removed (lb)</Text>
                  <TextInput selectionColor={colors.primary}
                    ref={weightInputRef}
                    style={[styles.numericInput, errors.weightPounds && styles.inputError]}
                    value={weightPounds}
                    onChangeText={(value) => {
                      setWeightPounds(value);
                      setErrors((current) => ({ ...current, weightPounds: undefined }));
                    }}
                    placeholder="12.5"
                    keyboardType="decimal-pad"
                    maxLength={8}
                    editable={!submitting}
                    onFocus={() => revealCleanupEntryField(weightInputRef)}
                  />
                  <ErrorText style={styles.error}>{errors.weightPounds}</ErrorText>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={continueToReview}>
              <Text style={styles.primaryButtonText}>Check before sending</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewHeading}>This is what the reporter will see</Text>
              <Text style={styles.reviewLabel}>After photos</Text>
              <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <CleanupPhoto key={`${photo.uri}-${index}`} photo={photo} index={index} review />
                ))}
              </View>
              {photos.length === 1 ? (
                <View style={styles.encouragement}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.yellow} />
                  <Text style={styles.encouragementText}>
                    One photo is allowed. Add another angle if it would make the result clearer.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.reviewLabel}>Your note</Text>
              <Text style={styles.reviewText}>{normalized.description}</Text>

              <View style={styles.reviewMetrics}>
                <View style={styles.reviewMetric}>
                  <Text style={styles.reviewLabel}>Bags or items</Text>
                  <Text style={styles.reviewMetricValue}>{normalized.bagsOrItemsRemoved ?? 'Not provided'}</Text>
                </View>
                <View style={styles.reviewMetric}>
                  <Text style={styles.reviewLabel}>Weight removed</Text>
                  <Text style={styles.reviewMetricValue}>
                    {normalized.weightPounds ? `${normalized.weightPounds} lb` : 'Not provided'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.reviewNotice}>
              {context.attempt.is_paid
                ? 'Your photos are checked first. Once they pass, the reporter has 48 hours to review your cleanup. Any required team review must also finish before a reward is sent.'
                : 'The reporter has 48 hours to check it. If they don’t respond, it’s approved automatically.'}
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.disabled]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? (
                <LoadingButtonContent label="Submitting cleanup…" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={21} color={colors.white} />
                  <Text style={styles.primaryButtonText}>
                    {isCorrection ? 'Resend cleanup' : 'Send cleanup'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <SecondaryButton label="Edit" onPress={() => setStep('form')} disabled={submitting} style={styles.secondaryButton} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: 20 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.white },
  flowHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flowBug: { width: 44, height: 44 },
  title: { color: colors.ink, fontSize: 20, lineHeight: 24, fontFamily: fonts.heading },
  reportTitle: { marginTop: 2, color: colors.muted, fontSize: 14, lineHeight: 21 },
  correctionNotice: { marginTop: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, backgroundColor: colors.yellowSoft },
  correctionNoticeCopy: { flex: 1 },
  correctionNoticeTitle: { color: colors.yellow, fontSize: 14, fontWeight: '600' },
  correctionNoticeText: { marginTop: 3, color: colors.yellow, fontSize: 13, lineHeight: 18 },
  feedbackLink: { marginTop: 7, color: colors.primary, fontSize: 13, fontWeight: '600' },
  section: { marginTop: 22, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { flex: 1, color: colors.ink, fontSize: 17, lineHeight: 23, fontFamily: fonts.heading },
  required: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  helper: { marginTop: 7, color: colors.muted, fontSize: 14, lineHeight: 20 },
  photoGrid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  photoWrap: { width: '31%', aspectRatio: 1, borderRadius: 13, overflow: 'hidden', backgroundColor: colors.line },
  photo: { width: '100%', height: '100%' },
  photoLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.line },
  removePhoto: { position: 'absolute', top: 2, right: 2, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(41, 41, 50, 0.78)' },
  photoActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  photoButton: { flex: 1, minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: colors.primaryBorder, borderBottomWidth: 4, borderBottomColor: colors.edge, borderRadius: 13, backgroundColor: colors.white },
  photoButtonText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  descriptionInput: { minHeight: 132, marginTop: 14, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 13, color: colors.ink, fontSize: 16, lineHeight: 22, backgroundColor: colors.white },
  characterCount: { marginTop: 5, color: colors.subtle, fontSize: 12, textAlign: 'right' },
  numericRow: { marginTop: 14, flexDirection: 'row', gap: 12 },
  numericField: { flex: 1 },
  inputLabel: { color: colors.body, fontSize: 13, fontWeight: '700' },
  numericInput: { minHeight: 50, marginTop: 7, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.ink, fontSize: 16, backgroundColor: colors.white },
  inputError: { borderColor: colors.red },
  error: { marginTop: 7, fontSize: 13, lineHeight: 18 },
  primaryButton: { minHeight: 54, marginTop: 22, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: colors.primary },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  secondaryButton: { marginTop: 12 },
  reviewCard: { marginTop: 22, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white },
  reviewHeading: { color: colors.ink, fontSize: 16, fontFamily: fonts.heading },
  reviewLabel: { marginTop: 16, color: colors.muted, fontSize: 13, fontWeight: '600' },
  reviewPhotoWrap: { width: '31%', aspectRatio: 1, overflow: 'hidden', borderRadius: 12, backgroundColor: colors.line },
  reviewPhoto: { width: '100%', height: '100%' },
  reviewText: { marginTop: 7, color: colors.ink, fontSize: 16, lineHeight: 23 },
  reviewMetrics: { flexDirection: 'row', gap: 12 },
  reviewMetric: { flex: 1 },
  reviewMetricValue: { marginTop: 5, color: colors.ink, fontSize: 15, fontWeight: '600' },
  encouragement: { marginTop: 13, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, backgroundColor: colors.yellowSoft },
  encouragementText: { flex: 1, color: colors.yellow, fontSize: 13, lineHeight: 18 },
  reviewNotice: { marginTop: 17, paddingHorizontal: 5, color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  disabled: { opacity: 0.6 },
});
