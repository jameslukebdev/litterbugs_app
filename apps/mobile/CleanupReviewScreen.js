import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CompactRankBadge from './CompactRankBadge';
import ProfileAvatar from './ProfileAvatar';
import {
  disputePaidCleanup,
  loadCleanupReviewContext,
  reviewCleanup,
} from './lib/cleanupReview';
import { formatUsd } from './lib/funding';
import {
  CLEANUP_CHANGE_REASONS,
  MAX_CLEANUP_REVIEW_NOTE_LENGTH,
  validateCleanupChangeRequest,
} from './lib/cleanupReviewValidation';
import { permanentUserId } from './lib/reportAccess';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';

const reviewErrorMessage = (error) => {
  const message = error?.message ?? '';
  if (/cleanup_review_not_allowed/i.test(message)) {
    return 'Only the original reporter can review this cleanup.';
  }
  if (/cleanup_review_invalid_state|cleanup_review_submission_is_not_current/i.test(message)) {
    return 'This cleanup is no longer awaiting review.';
  }
  if (/cleanup_review_evidence_unavailable/i.test(message)) {
    return 'The submitted cleanup evidence could not be loaded.';
  }
  if (/paid_cleanup_review_not_ready/i.test(message)) {
    return 'The cleanup must pass its safety and payment review before you can approve it.';
  }
  return 'Check your connection and try again.';
};

const formatSubmittedAt = (value) => new Date(value).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function LoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color="#2F7D32" />
      <Text style={styles.centerText}>Loading cleanup evidence…</Text>
    </View>
  );
}

function ReviewPhoto({ title, url, index, count, width }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  return (
    <View style={[styles.photoViewer, { width }]}>
      {!failed ? (
        <ExpoImage
          key={`${url}-${retryCount}`}
          source={url}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={180}
          style={styles.photo}
          onLoadStart={() => {
            setLoading(true);
            setFailed(false);
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
          accessibilityLabel={`${title} photo ${index + 1}`}
        />
      ) : null}

      {loading ? (
        <View style={styles.photoOverlay}>
          <ActivityIndicator color="#2F7D32" />
          <Text style={styles.photoStatusText}>Loading photo…</Text>
        </View>
      ) : null}

      {failed ? (
        <View style={styles.photoOverlay}>
          <Ionicons name="image-outline" size={32} color="#7A848A" />
          <Text style={styles.photoStatusText}>Photo couldn’t load.</Text>
          <TouchableOpacity
            style={styles.photoRetryButton}
            onPress={() => {
              setFailed(false);
              setLoading(true);
              setRetryCount((current) => current + 1);
            }}
          >
            <Text style={styles.photoRetryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {count > 1 ? (
        <View style={styles.photoCountBadge}>
          <Text style={styles.photoCountText}>{index + 1} / {count}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PhotoSection({ title, urls, emptyText, width }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {urls.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroll}
        >
          {urls.map((url, index) => (
            <ReviewPhoto
              key={`${title}-${index}`}
              title={title}
              url={url}
              index={index}
              count={urls.length}
              width={width}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyPhotoState}>
          <Ionicons name="image-outline" size={28} color="#7A848A" />
          <Text style={styles.emptyPhotoText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );
}

export default function CleanupReviewScreen({ navigation, route }) {
  const cleanupId = route?.params?.cleanupId;
  const { user } = useSession();
  const userId = permanentUserId(user);
  const { refreshReports } = useReports();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [mode, setMode] = useState('review');
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    if (!cleanupId || !userId) {
      setLoadError('This cleanup review could not be opened.');
      setLoading(false);
      return undefined;
    }

    loadCleanupReviewContext(cleanupId, userId)
      .then((nextContext) => {
        if (active) setContext(nextContext);
      })
      .catch((error) => {
        console.log('Cleanup review context error:', error);
        if (active) setLoadError(reviewErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cleanupId, userId]);

  const viewReport = () => {
    navigation.navigate('App', {
      screen: 'Map',
      params: { reportId: context.attempt.report_id },
    });
  };

  const completeReview = async ({ decision, reasons = null, reviewerNote = null }) => {
    if (submitting || !context) return;

    try {
      setSubmitting(true);
      const reviewedAttempt = await reviewCleanup({
        cleanupId: context.attempt.id,
        submissionId: context.submission.id,
        decision,
        reasons,
        note: reviewerNote,
      });
      await refreshReports({ showRefresh: false });

      const completed = reviewedAttempt.status === 'completed';
      Alert.alert(
        completed ? 'Cleanup complete' : 'Changes requested',
        completed
          ? 'This cleanup is now preserved as a completed community impact record.'
          : 'The cleaner can now submit updated cleanup evidence.',
        [{ text: 'View report', onPress: viewReport }],
        { cancelable: false }
      );
    } catch (error) {
      console.log('Cleanup review error:', error);
      Alert.alert('Couldn’t review cleanup', reviewErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmApproval = () => {
    Alert.alert(
      'Approve this cleanup?',
      context?.attempt?.is_paid
        ? 'This will mark the report as cleaned, end your dispute window, and start the protected reward payout.'
        : 'This will mark the litter report as cleaned and preserve it as a completed cleanup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Cleanup',
          onPress: () => completeReview({ decision: 'approved' }),
        },
      ]
    );
  };

  const toggleReason = (reason) => {
    setSelectedReasons((current) => (
      current.includes(reason)
        ? current.filter((value) => value !== reason)
        : [...current, reason]
    ));
    setErrors((current) => ({ ...current, reasons: undefined }));
  };

  const submitChangeRequest = () => {
    const validation = validateCleanupChangeRequest({
      reasons: selectedReasons,
      note,
    });
    setErrors(validation.errors);
    if (!validation.valid) return;

    Alert.alert(
      'Request these changes?',
      'The cleanup will return to the cleaner for updated evidence.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Changes',
          style: 'destructive',
          onPress: () => completeReview({
            decision: 'changes_requested',
            reasons: validation.normalized.reasons,
            reviewerNote: validation.normalized.note,
          }),
        },
      ]
    );
  };

  const submitPaidDispute = () => {
    const reason = note.trim();
    if (reason.length < 3) {
      setErrors({ note: 'Briefly explain what does not look right.' });
      return;
    }
    Alert.alert(
      'Dispute this cleanup?',
      'The payout will remain paused while a Litterbugs team member reviews the photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit dispute',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              const nextAttempt = await disputePaidCleanup(context.attempt.id, reason);
              setContext((current) => ({ ...current, attempt: nextAttempt }));
              setMode('review');
              Alert.alert('Dispute submitted', 'A Litterbugs team member will review it. The reward remains paused.');
            } catch (error) {
              Alert.alert('Couldn’t submit dispute', reviewErrorMessage(error));
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingState />;

  if (loadError || !context) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={44} color="#A33A32" />
        <Text style={styles.centerTitle}>Review unavailable</Text>
        <Text style={styles.centerText}>{loadError}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cleanerName = context.cleaner?.display_name || 'Cleaner profile unavailable';
  const photoViewerWidth = Math.max(screenWidth - 74, 280);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>REPORTER REVIEW</Text>
        <Text style={styles.title}>Review cleanup evidence</Text>
        <Text style={styles.reportTitle}>{context.report.title || 'Litter cleanup'}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cleaner</Text>
          <TouchableOpacity
            style={styles.identityRow}
            disabled={!context.cleaner?.id}
            onPress={() => navigation.navigate('PublicProfile', {
              profileId: context.cleaner.id,
              sourceReportId: context.report.id,
            })}
            accessibilityRole={context.cleaner?.id ? 'button' : undefined}
            accessibilityLabel={context.cleaner?.id ? `View ${cleanerName} profile` : undefined}
          >
            <ProfileAvatar profile={context.cleaner} size={48} />
            <View style={styles.identityCopy}>
              <Text style={styles.identityName}>{cleanerName}</Text>
              <CompactRankBadge userId={context.cleaner?.id} />
              {context.cleaner?.username ? (
                <Text style={styles.identityUsername}>@{context.cleaner.username}</Text>
              ) : null}
              {context.attempt.is_self_cleanup ? (
                <Text style={styles.selfCleanup}>Original reporter and cleaner</Text>
              ) : null}
            </View>
            {context.cleaner?.id ? (
              <Ionicons name="chevron-forward" size={20} color="#7B858B" />
            ) : null}
          </TouchableOpacity>
        </View>

        <PhotoSection
          title="Before"
          urls={context.beforePhotoUrls}
          emptyText="No original photo was provided."
          width={photoViewerWidth}
        />

        {context.attempt.is_paid ? (
          <View style={styles.financialCard}>
            <Text style={styles.financialEyebrow}>FUNDED CLEANUP</Text>
            <Text style={styles.financialReward}>Cleaner receives {formatUsd(context.attempt.reward_amount_cents)}</Text>
            <Text style={styles.financialSummary}>
              {context.attempt.financial_review_summary
                || 'We’re checking photo quality, location consistency, and obvious signs that the images were altered.'}
            </Text>
            {context.attempt.review_due_at ? (
              <Text style={styles.disputeDeadline}>
                Dispute by {new Date(context.attempt.review_due_at).toLocaleString()}
              </Text>
            ) : (
              <Text style={styles.disputeDeadline}>The 48-hour dispute window has not started yet.</Text>
            )}
          </View>
        ) : null}
        <PhotoSection
          title="After"
          urls={context.afterPhotoUrls}
          emptyText="The submitted after photos are unavailable."
          width={photoViewerWidth}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cleanup information</Text>
          <Text style={styles.infoLabel}>DESCRIPTION</Text>
          <Text style={styles.description}>{context.submission.description}</Text>

          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.infoLabel}>BAGS/ITEMS</Text>
              <Text style={styles.metricValue}>
                {context.submission.bags_or_items_removed ?? 'Not provided'}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.infoLabel}>TIME SPENT</Text>
              <Text style={styles.metricValue}>
                {context.submission.duration_minutes
                  ? `${context.submission.duration_minutes} min`
                  : 'Not provided'}
              </Text>
            </View>
          </View>

          <Text style={styles.infoLabel}>SUBMITTED</Text>
          <Text style={styles.metricValue}>
            {formatSubmittedAt(context.submission.created_at)}
          </Text>
        </View>

        {context.attempt.is_paid && mode === 'review' ? (
          <View style={styles.actionSection}>
            {context.attempt.dispute_status === 'open' ? (
              <View style={styles.disputeStatusCard}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#8A6400" />
                <Text style={styles.disputeStatusText}>A Litterbugs team member is reviewing your dispute. The reward remains paused.</Text>
              </View>
            ) : context.attempt.financial_review_status === 'passed' && context.attempt.review_due_at ? (
              <>
                <Text style={styles.paidReviewNotice}>Approve now if the cleanup looks complete, or dispute it if something is wrong. If you do nothing, it is automatically approved after 48 hours.</Text>
                <TouchableOpacity
                  style={[styles.approveButton, submitting && styles.disabled]}
                  onPress={confirmApproval}
                  disabled={submitting}
                >
                  <Ionicons name="checkmark-circle-outline" size={21} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>Approve Cleanup</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.requestButton} onPress={() => setMode('dispute')} disabled={submitting}>
                  <Ionicons name="flag-outline" size={21} color="#A33A32" />
                  <Text style={styles.requestButtonText}>Dispute cleanup</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.disputeStatusCard}>
                <ActivityIndicator color="#8A6400" />
                <Text style={styles.disputeStatusText}>The cleanup is still being reviewed. The payout is paused.</Text>
              </View>
            )}
          </View>
        ) : context.attempt.is_paid && mode === 'dispute' ? (
          <View style={styles.changeSection}>
            <Text style={styles.sectionTitle}>Explain the dispute</Text>
            <Text style={styles.helper}>Describe what looks incomplete, unsafe, or inconsistent with the original report.</Text>
            <TextInput
              style={[styles.noteInput, errors.note && styles.inputError]}
              value={note}
              onChangeText={(value) => { setNote(value); setErrors({}); }}
              placeholder="What should our team review?"
              multiline
              maxLength={1000}
              textAlignVertical="top"
              editable={!submitting}
            />
            {errors.note ? <Text style={styles.error}>{errors.note}</Text> : null}
            <TouchableOpacity style={[styles.requestSubmitButton, submitting && styles.disabled]} onPress={submitPaidDispute} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.requestSubmitText}>Submit dispute</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setMode('review')} disabled={submitting}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : mode === 'review' ? (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.approveButton, submitting && styles.disabled]}
              onPress={confirmApproval}
              disabled={submitting}
            >
              <Ionicons name="checkmark-circle-outline" size={21} color="#FFFFFF" />
              <Text style={styles.approveButtonText}>Approve Cleanup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.requestButton}
              onPress={() => setMode('request_changes')}
              disabled={submitting}
            >
              <Ionicons name="refresh-circle-outline" size={21} color="#A33A32" />
              <Text style={styles.requestButtonText}>Request Changes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.changeSection}>
            <Text style={styles.sectionTitle}>Request changes</Text>
            <Text style={styles.helper}>
              Choose one or more specific updates. This is evidence feedback, not a chat.
            </Text>

            <View style={styles.reasonList}>
              {CLEANUP_CHANGE_REASONS.map((reason) => {
                const selected = selectedReasons.includes(reason.code);
                return (
                  <TouchableOpacity
                    key={reason.code}
                    style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                    onPress={() => toggleReason(reason.code)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={23}
                      color={selected ? '#2F7D32' : '#7B858B'}
                    />
                    <View style={styles.reasonCopy}>
                      <Text style={styles.reasonTitle}>{reason.label}</Text>
                      <Text style={styles.reasonDescription}>{reason.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.reasons ? <Text style={styles.error}>{errors.reasons}</Text> : null}

            <Text style={styles.noteLabel}>Optional note</Text>
            <TextInput
              style={[styles.noteInput, errors.note && styles.inputError]}
              value={note}
              onChangeText={(value) => {
                setNote(value);
                setErrors((current) => ({ ...current, note: undefined }));
              }}
              placeholder="Briefly explain what the cleaner should update."
              multiline
              maxLength={MAX_CLEANUP_REVIEW_NOTE_LENGTH}
              textAlignVertical="top"
              editable={!submitting}
              accessibilityLabel="Optional cleanup change note"
            />
            <Text style={styles.characterCount}>
              {note.length}/{MAX_CLEANUP_REVIEW_NOTE_LENGTH}
            </Text>
            {errors.note ? <Text style={styles.error}>{errors.note}</Text> : null}

            <TouchableOpacity
              style={[styles.requestSubmitButton, submitting && styles.disabled]}
              onPress={submitChangeRequest}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.requestSubmitText}>Send Change Request</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setMode('review')}
              disabled={submitting}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  section: { marginTop: 20, padding: 17, borderRadius: 18, backgroundColor: '#FFFFFF' },
  sectionTitle: { color: '#30363B', fontSize: 18, fontWeight: '800' },
  financialCard: { marginTop: 20, padding: 18, borderWidth: 1, borderColor: '#9CCB9F', borderRadius: 18, backgroundColor: '#EAF6EB' },
  financialEyebrow: { color: '#3F6843', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  financialReward: { marginTop: 5, color: '#245F2A', fontSize: 22, fontWeight: '900' },
  financialSummary: { marginTop: 8, color: '#526C55', fontSize: 14, lineHeight: 20 },
  disputeDeadline: { marginTop: 10, color: '#37633B', fontSize: 13, fontWeight: '800' },
  paidReviewNotice: { padding: 15, color: '#59636A', fontSize: 14, lineHeight: 20, borderRadius: 13, backgroundColor: '#FFFFFF' },
  disputeStatusCard: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E7CF79', borderRadius: 14, backgroundColor: '#FFF9DD' },
  disputeStatusText: { flex: 1, color: '#755900', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  identityRow: { minHeight: 64, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  identityCopy: { flex: 1, marginLeft: 12 },
  identityName: { color: '#202428', fontSize: 16, fontWeight: '800' },
  identityUsername: { marginTop: 2, color: '#687178', fontSize: 13 },
  selfCleanup: { marginTop: 4, color: '#2F7D32', fontSize: 12, fontWeight: '800' },
  photoScroll: { marginTop: 13, borderRadius: 15 },
  photoViewer: { height: 300, overflow: 'hidden', borderRadius: 15, backgroundColor: '#E9ECEE' },
  photo: { width: '100%', height: '100%' },
  photoOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#EEF1F2' },
  photoStatusText: { color: '#687178', fontSize: 14, fontWeight: '700' },
  photoRetryButton: { minHeight: 38, marginTop: 2, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#8FBC92', borderRadius: 11, backgroundColor: '#FFFFFF' },
  photoRetryText: { color: '#2F7D32', fontSize: 13, fontWeight: '800' },
  photoCountBadge: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(31, 36, 39, 0.76)' },
  photoCountText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  emptyPhotoState: { minHeight: 108, marginTop: 13, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, backgroundColor: '#F1F3F4' },
  emptyPhotoText: { color: '#687178', fontSize: 14, textAlign: 'center' },
  infoLabel: { marginTop: 17, color: '#6D767D', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  description: { marginTop: 7, color: '#30363B', fontSize: 16, lineHeight: 23 },
  metricRow: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1 },
  metricValue: { marginTop: 5, color: '#30363B', fontSize: 15, fontWeight: '800' },
  actionSection: { marginTop: 22 },
  approveButton: { minHeight: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: '#2F7D32' },
  approveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  requestButton: { minHeight: 52, marginTop: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#D9AAA5', borderRadius: 14, backgroundColor: '#FFFFFF' },
  requestButtonText: { color: '#A33A32', fontSize: 15, fontWeight: '900' },
  changeSection: { marginTop: 22, padding: 17, borderRadius: 18, backgroundColor: '#FFFFFF' },
  helper: { marginTop: 7, color: '#6D767D', fontSize: 14, lineHeight: 20 },
  reasonList: { marginTop: 14, gap: 9 },
  reasonRow: { padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#D6DBDE', borderRadius: 13, backgroundColor: '#FFFFFF' },
  reasonRowSelected: { borderColor: '#7EB282', backgroundColor: '#F4FAF4' },
  reasonCopy: { flex: 1 },
  reasonTitle: { color: '#30363B', fontSize: 14, fontWeight: '800' },
  reasonDescription: { marginTop: 3, color: '#6D767D', fontSize: 13, lineHeight: 18 },
  noteLabel: { marginTop: 18, color: '#59636A', fontSize: 13, fontWeight: '800' },
  noteInput: { minHeight: 112, marginTop: 8, padding: 13, borderWidth: 1, borderColor: '#CED4D7', borderRadius: 13, color: '#202428', fontSize: 15, lineHeight: 21, backgroundColor: '#FFFFFF' },
  characterCount: { marginTop: 5, color: '#8A9297', fontSize: 12, textAlign: 'right' },
  inputError: { borderColor: '#C94F45' },
  error: { marginTop: 7, color: '#B63D34', fontSize: 13, lineHeight: 18 },
  requestSubmitButton: { minHeight: 52, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#A33A32' },
  requestSubmitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondaryButton: { minHeight: 50, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#98B79A', borderRadius: 14, backgroundColor: '#FFFFFF' },
  secondaryButtonText: { color: '#2F7D32', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
