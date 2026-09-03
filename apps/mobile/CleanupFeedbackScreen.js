import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandedLoadingState from './BrandedLoadingState';

import { loadCleanupFeedbackContext } from './lib/cleanupFeedback';
import { cleanupChangeReasonLabel } from './lib/cleanupReviewValidation';
import { permanentUserId } from './lib/reportAccess';
import { useSession } from './lib/session';

const formatDateTime = (value) => {
  if (!value) return 'Deadline unavailable';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const feedbackErrorMessage = (error) => {
  const message = error?.message ?? '';
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
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let active = true;

    if (!cleanupId || !userId) {
      setLoadError('This cleanup feedback could not be opened.');
      setLoading(false);
      return undefined;
    }

    loadCleanupFeedbackContext(cleanupId, userId)
      .then((nextContext) => {
        if (active) setContext(nextContext);
      })
      .catch((error) => {
        console.log('Cleanup feedback context error:', error);
        if (active) setLoadError(feedbackErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cleanupId, userId]);

  if (loading) {
    return <BrandedLoadingState title="Loading feedback…" message="Gathering the requested cleanup changes." />;
  }

  if (loadError || !context) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={44} color="#A33A32" />
        <Text style={styles.centerTitle}>Feedback unavailable</Text>
        <Text style={styles.centerText}>{loadError}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const updateSubmission = () => navigation.replace('CleanupSubmission', {
    cleanupId: context.attempt.id,
    reportId: context.attempt.report_id,
  });
  const viewReport = () => navigation.navigate('App', {
    screen: 'Map',
    params: { reportId: context.attempt.report_id },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statusIcon}>
        <Ionicons name="refresh-circle-outline" size={36} color="#8A6400" />
      </View>
      <Text style={styles.eyebrow}>CHANGES REQUESTED</Text>
      <Text style={styles.title}>Review reporter feedback</Text>
      <Text style={styles.reportTitle}>{context.report.title || 'Litter cleanup'}</Text>

      <View style={styles.deadlineCard}>
        <Ionicons name="time-outline" size={22} color="#755900" />
        <View style={styles.deadlineCopy}>
          <Text style={styles.deadlineLabel}>Update submission by</Text>
          <Text style={styles.deadlineValue}>{formatDateTime(context.attempt.correction_due_at)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Requested updates</Text>
        {(context.review.reason_codes ?? []).map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <Ionicons name="checkmark-circle" size={21} color="#8A6400" />
            <Text style={styles.reasonText}>{cleanupChangeReasonLabel(reason)}</Text>
          </View>
        ))}

        <Text style={styles.noteLabel}>REPORTER NOTE</Text>
        <Text style={context.review.note ? styles.note : styles.emptyNote}>
          {context.review.note || 'No additional note was provided.'}
        </Text>
        <Text style={styles.requestedAt}>Requested {formatDateTime(context.review.created_at)}</Text>
      </View>

      <View style={styles.historyNotice}>
        <Ionicons name="documents-outline" size={21} color="#536068" />
        <Text style={styles.historyText}>
          Your earlier evidence and this review remain in the cleanup history. Resubmitting creates a new revision.
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={updateSubmission}>
        <Ionicons name="camera-outline" size={21} color="#FFFFFF" />
        <Text style={styles.primaryButtonText}>Update Submission</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={viewReport}>
        <Text style={styles.secondaryButtonText}>View Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  content: { padding: 20 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F5F6F7' },
  centerTitle: { marginTop: 14, color: '#30363B', fontSize: 22, fontWeight: '800' },
  centerText: { maxWidth: 340, marginTop: 9, color: '#677178', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  statusIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: '#FFF3BF' },
  eyebrow: { marginTop: 18, color: '#8A6400', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 7, color: '#202428', fontSize: 28, fontWeight: '900' },
  reportTitle: { marginTop: 7, color: '#687178', fontSize: 15, fontWeight: '700' },
  deadlineCard: { marginTop: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 15, backgroundColor: '#FFF9DD' },
  deadlineCopy: { flex: 1 },
  deadlineLabel: { color: '#755900', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  deadlineValue: { marginTop: 3, color: '#594500', fontSize: 16, fontWeight: '900' },
  section: { marginTop: 20, padding: 17, borderRadius: 18, backgroundColor: '#FFFFFF' },
  sectionTitle: { color: '#30363B', fontSize: 18, fontWeight: '800' },
  reasonRow: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  reasonText: { flex: 1, color: '#30363B', fontSize: 15, fontWeight: '700' },
  noteLabel: { marginTop: 20, color: '#6D767D', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  note: { marginTop: 7, color: '#30363B', fontSize: 16, lineHeight: 23 },
  emptyNote: { marginTop: 7, color: '#7A848A', fontSize: 15, fontStyle: 'italic' },
  requestedAt: { marginTop: 16, color: '#7A848A', fontSize: 12 },
  historyNotice: { marginTop: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, backgroundColor: '#E9EEF0' },
  historyText: { flex: 1, color: '#536068', fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 54, marginTop: 22, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: '#2F7D32' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryButton: { minHeight: 50, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#98B79A', borderRadius: 14, backgroundColor: '#FFFFFF' },
  secondaryButtonText: { color: '#2F7D32', fontSize: 15, fontWeight: '800' },
});
