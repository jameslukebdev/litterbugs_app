import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { permanentUserId } from './lib/reportAccess';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';

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
  return <BrandedLoadingState title="Opening cleanup…" message="Loading the report and your cleanup details." />;
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
          <ActivityIndicator color="#2F7D32" />
        </View>
      ) : null}
      {!review ? (
        <TouchableOpacity
          style={styles.removePhoto}
          onPress={() => onRemove(index)}
          accessibilityRole="button"
          accessibilityLabel={`Remove cleanup photo ${index + 1}`}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
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
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [step, setStep] = useState('form');
  const [photos, setPhotos] = useState([]);
  const [description, setDescription] = useState('');
  const [bagsOrItemsRemoved, setBagsOrItemsRemoved] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({
    stage: 'preparing',
    current: 1,
    total: 1,
  });

  useEffect(() => {
    let active = true;

    if (!cleanupId || !userId) {
      setLoadError('This cleanup could not be opened.');
      setLoading(false);
      return undefined;
    }

    loadCleanupSubmissionContext(cleanupId, userId)
      .then((nextContext) => {
        if (active) setContext(nextContext);
      })
      .catch((error) => {
        console.log('Cleanup submission context error:', error);
        if (active) setLoadError(submissionErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cleanupId, userId]);

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
    durationMinutes,
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
      const result = await uploadCleanupSubmission({
        cleanupId: context.attempt.id,
        userId,
        photos,
        isPaid: context.attempt.is_paid,
        onProgress: setSubmissionProgress,
        ...validation.normalized,
      });
      await refreshReports({ showRefresh: false });

      const aiDecision = result.aiReview?.ai;
      const paidMessage = aiDecision?.status === 'better_photos'
        ? aiDecision.summary
        : aiDecision?.status === 'passed'
          ? 'Your photos passed review. The reporter can approve the cleanup now or dispute it within 48 hours.'
          : aiDecision?.status === 'admin_review'
            ? 'A Litterbugs team member is reviewing the photos. Your payout is paused, and we’ll contact you if we need anything.'
            : 'Your photos are being reviewed. The 48-hour dispute window starts only after they pass.';

      Alert.alert(
        aiDecision?.status === 'better_photos'
          ? 'Better photos needed'
          : context.attempt.status === 'changes_requested'
          ? 'Cleanup resubmitted'
          : 'Cleanup submitted',
        context.attempt.is_paid
          ? paidMessage
          : 'Your cleanup evidence is awaiting review. The original reporter has 48 hours to respond before automatic approval.',
        [{
          text: aiDecision?.status === 'better_photos' ? 'Review feedback' : 'View report',
          onPress: () => aiDecision?.status === 'better_photos'
            ? navigation.replace('CleanupFeedback', { cleanupId: context.attempt.id })
            : navigation.navigate('App', {
              screen: 'Map',
              params: { reportId: context.attempt.report_id },
            }),
        }],
        { cancelable: false }
      );
    } catch (error) {
      console.log('Cleanup submission error:', error);
      Alert.alert('Couldn’t submit cleanup', submissionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;

  if (loadError || !context) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={44} color="#A33A32" />
        <Text style={styles.centerTitle}>Cleanup unavailable</Text>
        <Text style={styles.centerText}>{loadError}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const reportTitle = context.report?.title || 'Litter cleanup';
  const normalized = currentValidation().normalized;
  const isCorrection = context.attempt.status === 'changes_requested';
  const correctionDeadline = isCorrection
    ? new Date(context.attempt.correction_due_at).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
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
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>
          {step === 'form' ? (isCorrection ? 'UPDATE EVIDENCE' : 'CLEANUP EVIDENCE') : 'REVIEW'}
        </Text>
        <Text style={styles.title}>
          {step === 'form'
            ? (isCorrection ? 'Update your submission' : 'Show what you cleaned')
            : (isCorrection ? 'Review your update' : 'Review your cleanup')}
        </Text>
        <Text style={styles.reportTitle}>{reportTitle}</Text>

        {isCorrection && step === 'form' ? (
          <View style={styles.correctionNotice}>
            <Ionicons name="time-outline" size={21} color="#755900" />
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
                <Text style={styles.sectionTitle}>After photos</Text>
                <Text style={styles.required}>REQUIRED · {photos.length}/{MAX_CLEANUP_PHOTOS}</Text>
              </View>
              <Text style={styles.helper}>
                Add 1–3 photos. When appropriate, include another angle to clearly show the completed cleanup.
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
                    <Ionicons name="camera-outline" size={20} color="#2F7D32" />
                    <Text style={styles.photoButtonText}>Take photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoButton} onPress={() => addPhotos('library')}>
                    <Ionicons name="images-outline" size={20} color="#2F7D32" />
                    <Text style={styles.photoButtonText}>Choose photos</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {errors.photos ? <Text style={styles.error}>{errors.photos}</Text> : null}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Cleanup description</Text>
                <Text style={styles.required}>REQUIRED</Text>
              </View>
              <TextInput
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
                accessibilityLabel="Cleanup description"
              />
              <Text style={styles.characterCount}>
                {description.length}/{MAX_CLEANUP_DESCRIPTION_LENGTH}
              </Text>
              {errors.description ? <Text style={styles.error}>{errors.description}</Text> : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Impact details</Text>
              <Text style={styles.helper}>Optional information for future community impact reporting.</Text>
              <View style={styles.numericRow}>
                <View style={styles.numericField}>
                  <Text style={styles.inputLabel}>Bags/items removed</Text>
                  <TextInput
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
                  />
                  {errors.bagsOrItemsRemoved ? <Text style={styles.error}>{errors.bagsOrItemsRemoved}</Text> : null}
                </View>
                <View style={styles.numericField}>
                  <Text style={styles.inputLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={[styles.numericInput, errors.durationMinutes && styles.inputError]}
                    value={durationMinutes}
                    onChangeText={(value) => {
                      setDurationMinutes(value);
                      setErrors((current) => ({ ...current, durationMinutes: undefined }));
                    }}
                    placeholder="35"
                    keyboardType="number-pad"
                    maxLength={4}
                    editable={!submitting}
                  />
                  {errors.durationMinutes ? <Text style={styles.error}>{errors.durationMinutes}</Text> : null}
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={continueToReview}>
              <Text style={styles.primaryButtonText}>Review Cleanup</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>AFTER PHOTOS</Text>
              <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <CleanupPhoto key={`${photo.uri}-${index}`} photo={photo} index={index} review />
                ))}
              </View>
              {photos.length === 1 ? (
                <View style={styles.encouragement}>
                  <Ionicons name="information-circle-outline" size={20} color="#755900" />
                  <Text style={styles.encouragementText}>
                    One photo is allowed. Add another angle if it would make the result clearer.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.reviewLabel}>DESCRIPTION</Text>
              <Text style={styles.reviewText}>{normalized.description}</Text>

              <View style={styles.reviewMetrics}>
                <View style={styles.reviewMetric}>
                  <Text style={styles.reviewLabel}>BAGS/ITEMS</Text>
                  <Text style={styles.reviewMetricValue}>{normalized.bagsOrItemsRemoved ?? 'Not provided'}</Text>
                </View>
                <View style={styles.reviewMetric}>
                  <Text style={styles.reviewLabel}>DURATION</Text>
                  <Text style={styles.reviewMetricValue}>
                    {normalized.durationMinutes ? `${normalized.durationMinutes} min` : 'Not provided'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.reviewNotice}>
              After submission, the original reporter has 48 hours to review the cleanup before automatic approval.
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
                  <Ionicons name="checkmark-circle-outline" size={21} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    {isCorrection ? 'Resubmit Cleanup' : 'Submit Cleanup'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep('form')}
              disabled={submitting}
            >
              <Text style={styles.secondaryButtonText}>Edit details</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  content: { padding: 20 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F5F6F7' },
  centerTitle: { marginTop: 14, color: '#30363B', fontSize: 22, fontWeight: '800' },
  centerText: { maxWidth: 340, marginTop: 9, color: '#677178', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  eyebrow: { color: '#2F7D32', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 7, color: '#202428', fontSize: 28, fontWeight: '900' },
  reportTitle: { marginTop: 7, color: '#687178', fontSize: 15, fontWeight: '700' },
  correctionNotice: { marginTop: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, backgroundColor: '#FFF9DD' },
  correctionNoticeCopy: { flex: 1 },
  correctionNoticeTitle: { color: '#755900', fontSize: 14, fontWeight: '900' },
  correctionNoticeText: { marginTop: 3, color: '#755900', fontSize: 13, lineHeight: 18 },
  feedbackLink: { marginTop: 7, color: '#2F7D32', fontSize: 13, fontWeight: '900' },
  section: { marginTop: 22, padding: 17, borderRadius: 18, backgroundColor: '#FFFFFF' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { flex: 1, color: '#30363B', fontSize: 18, fontWeight: '800' },
  required: { color: '#2F7D32', fontSize: 11, fontWeight: '900' },
  helper: { marginTop: 7, color: '#6D767D', fontSize: 14, lineHeight: 20 },
  photoGrid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  photoWrap: { width: '31%', aspectRatio: 1, borderRadius: 13, overflow: 'hidden', backgroundColor: '#E9ECEE' },
  photo: { width: '100%', height: '100%' },
  photoLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9ECEE' },
  removePhoto: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,35,38,0.78)' },
  photoActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  photoButton: { flex: 1, minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#8FBC92', borderRadius: 13, backgroundColor: '#F6FBF6' },
  photoButtonText: { color: '#2F7D32', fontSize: 14, fontWeight: '800' },
  descriptionInput: { minHeight: 132, marginTop: 14, padding: 14, borderWidth: 1, borderColor: '#CED4D7', borderRadius: 13, color: '#202428', fontSize: 16, lineHeight: 22, backgroundColor: '#FFFFFF' },
  characterCount: { marginTop: 5, color: '#8A9297', fontSize: 12, textAlign: 'right' },
  numericRow: { marginTop: 14, flexDirection: 'row', gap: 12 },
  numericField: { flex: 1 },
  inputLabel: { color: '#59636A', fontSize: 13, fontWeight: '700' },
  numericInput: { minHeight: 50, marginTop: 7, paddingHorizontal: 13, borderWidth: 1, borderColor: '#CED4D7', borderRadius: 12, color: '#202428', fontSize: 16, backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#C94F45' },
  error: { marginTop: 7, color: '#B63D34', fontSize: 13, lineHeight: 18 },
  primaryButton: { minHeight: 54, marginTop: 22, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: '#2F7D32' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryButton: { minHeight: 50, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#98B79A', borderRadius: 14, backgroundColor: '#FFFFFF' },
  secondaryButtonText: { color: '#2F7D32', fontSize: 15, fontWeight: '800' },
  reviewCard: { marginTop: 22, padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF' },
  reviewLabel: { marginTop: 16, color: '#6D767D', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  reviewPhotoWrap: { width: '31%', aspectRatio: 1, overflow: 'hidden', borderRadius: 12, backgroundColor: '#E9ECEE' },
  reviewPhoto: { width: '100%', height: '100%' },
  reviewText: { marginTop: 7, color: '#30363B', fontSize: 16, lineHeight: 23 },
  reviewMetrics: { flexDirection: 'row', gap: 12 },
  reviewMetric: { flex: 1 },
  reviewMetricValue: { marginTop: 5, color: '#30363B', fontSize: 15, fontWeight: '800' },
  encouragement: { marginTop: 13, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, backgroundColor: '#FFF9DD' },
  encouragementText: { flex: 1, color: '#755900', fontSize: 13, lineHeight: 18 },
  reviewNotice: { marginTop: 17, paddingHorizontal: 5, color: '#667078', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  disabled: { opacity: 0.6 },
});
