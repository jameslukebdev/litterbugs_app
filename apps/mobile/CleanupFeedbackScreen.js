import { useCallback } from 'react';
import useFocusedResource from './lib/useFocusedResource';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingBee from './components/LoadingBee';
import { EmptyState, ErrorText, PrimaryButton, SecondaryButton, TextLink } from './components/ui';

import { loadCleanupFeedbackContext } from './lib/cleanupFeedback';
import { cleanupChangeReasonLabel } from './lib/cleanupReviewValidation';
import { permanentUserId } from './lib/reportAccess';
import { useSession } from './lib/session';
import { colors, fonts } from './lib/theme';

const formatDateTime = (value) => {
  if (!value) return 'Deadline unavailable';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const feedbackErrorMessage = (error) => {
  const message = error?.message ?? '';
  if (/cleanup_feedback_expired/i.test(message)) return 'The time to update this cleanup has ended. View the report for its current status.';
  if (/cleanup_feedback_not_allowed/i.test(message)) {
    return 'Only the assigned cleaner can review this feedback.';
  }
  if (/cleanup_feedback_(invalid_state|unavailable)/i.test(message)) {
    return 'This cleanup no longer has outstanding changes.';
  }
  return 'Check your connection and try again.';
};

export default function CleanupFeedbackScreen({ navigation, route }) {
  const cleanupId = route?.params?.cleanupId;
  const { user } = useSession();
  const userId = permanentUserId(user);
  const insets = useSafeAreaInsets();

  const resource = useFocusedResource(useCallback(() => loadCleanupFeedbackContext(cleanupId, userId), [cleanupId, userId]), { enabled: Boolean(cleanupId && userId) });
  const { data: context, loading, error: contextError, refresh: retryContext } = resource;
  const loadError = contextError ? feedbackErrorMessage(contextError) : null;


  if (loading && !context) {
    return <LoadingBee label="Loading feedback" style={styles.container} />;
  }

  if (!context) {
    return (
      <View style={styles.centerState}>
        <EmptyState icon={<Ionicons name="alert-circle-outline" size={40} color={colors.red} />} title="Feedback unavailable" text={loadError} action={{ label: 'Try again', onPress: retryContext }} />
        <TextLink label="Go back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const updateSubmission = () => {
    if (loading || contextError) return;
    if (Date.parse(context.attempt.correction_due_at) <= Date.now()) return retryContext();
    navigation.replace('CleanupSubmission', { cleanupId: context.attempt.id, reportId: context.attempt.report_id });
  };
  const viewReport = () => navigation.popTo('App', {
    screen: 'Map',
    params: { reportId: context.attempt.report_id },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {loadError ? (
        <View>
          <ErrorText style={styles.errorText}>{loadError}</ErrorText>
          <TextLink align="start" label="Try again" onPress={retryContext} />
        </View>
      ) : null}
      <Text style={styles.eyebrow}>Changes requested</Text>
      <Text style={styles.title}>Review reporter feedback</Text>
      <Text style={styles.reportTitle}>{context.report.title || 'Litter cleanup'}</Text>

      <View style={styles.deadlineCard}>
        <Ionicons name="time-outline" size={22} color={colors.yellow} />
        <View style={styles.deadlineCopy}>
          <Text style={styles.deadlineLabel}>Update submission by</Text>
          <Text style={styles.deadlineValue}>{formatDateTime(context.attempt.correction_due_at)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Requested updates</Text>
        {(context.review.reason_codes ?? []).map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <Ionicons name="ellipse-outline" size={18} color={colors.yellow} />
            <Text style={styles.reasonText}>{cleanupChangeReasonLabel(reason)}</Text>
          </View>
        ))}

        <Text style={styles.noteLabel}>Reporter note</Text>
        <Text style={context.review.note ? styles.note : styles.emptyNote}>
          {context.review.note || 'No additional note was provided.'}
        </Text>
        <Text style={styles.requestedAt}>Requested {formatDateTime(context.review.created_at)}</Text>
      </View>

      <View style={styles.historyNotice}>
        <Ionicons name="documents-outline" size={21} color={colors.body} />
        <Text style={styles.historyText}>
          Your earlier photos and this feedback stay in the cleanup history when you submit an update.
        </Text>
      </View>

      <PrimaryButton label="Update submission" disabled={loading || Boolean(contextError)} onPress={updateSubmission} style={styles.primaryButton} />
      <SecondaryButton label="View report" onPress={viewReport} style={styles.secondaryButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  errorText: { marginTop: 0 },
  content: { padding: 20 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.white },
  eyebrow: { marginTop: 4, color: colors.yellow, fontSize: 14, fontWeight: '700' },
  title: { marginTop: 7, color: colors.ink, fontSize: 24, lineHeight: 31, fontFamily: fonts.heading },
  reportTitle: { marginTop: 7, color: colors.muted, fontSize: 15, fontWeight: '700' },
  deadlineCard: { marginTop: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  deadlineCopy: { flex: 1 },
  deadlineLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  deadlineValue: { marginTop: 3, color: colors.yellow, fontSize: 16, fontWeight: '700' },
  section: { marginTop: 20, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white },
  sectionTitle: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '600' },
  reasonRow: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  reasonText: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '700' },
  noteLabel: { marginTop: 20, color: colors.muted, fontSize: 13, fontWeight: '600' },
  note: { marginTop: 7, color: colors.ink, fontSize: 16, lineHeight: 23 },
  emptyNote: { marginTop: 7, color: colors.muted, fontSize: 15, fontStyle: 'italic' },
  requestedAt: { marginTop: 16, color: colors.muted, fontSize: 12 },
  historyNotice: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  historyText: { flex: 1, color: colors.body, fontSize: 13, lineHeight: 19 },
  primaryButton: { marginTop: 22 },
  secondaryButton: { marginTop: 12 },
});
