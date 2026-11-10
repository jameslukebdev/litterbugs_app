import { useEffect, useRef, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import SteadyButtonContent from './components/SteadyButtonContent';
import { useSession } from './lib/session';
import { supabase } from './lib/supabase';
import { colors, fonts } from './lib/theme';

const REASONS = [
  ['spam_or_misleading', 'Spam or misleading'],
  ['harassment_or_hate', 'Harassment or hate'],
  ['inappropriate_content', 'Inappropriate content'],
  ['impersonation', 'Impersonation'],
  ['safety_concern', 'Safety concern'],
  ['other', 'Other'],
];

export default function ReportUserScreen({ navigation, route }) {
  const { user } = useSession();
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const reportedUserId = route.params?.profileId;

  const submitLock = useRef(false);
  const sent = useRef(false);
  const [discardAction, setDiscardAction] = useState(null);
  usePreventRemove(!sent.current && !discardAction && (submitting || Boolean(reason || details.trim())), ({ data }) => {
    if (submitting) return;
    Alert.alert('Discard this report?', 'Your explanation has not been submitted.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => setDiscardAction(data.action) },
    ]);
  });
  useEffect(() => { if (discardAction) navigation.dispatch(discardAction); }, [discardAction, navigation]);
  const submit = async () => {
    if (submitLock.current || sent.current) return;
    if (!reason) {
      setError('Choose a reason.');
      return;
    }
    if (reason === 'other' && !details.trim()) {
      setError('Add a short explanation for Other.');
      return;
    }

    try {
      submitLock.current = true;
      setSubmitting(true);
      setError('');
      const { error: reportError } = await supabase
        .from('user_moderation_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          source_report_id: route.params?.sourceReportId ?? null,
          reason,
          details: details.trim() || null,
        });

      if (reportError) throw reportError;
      sent.current = true;
      Alert.alert('Report received', 'Thank you. Your report was submitted for review.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (submitError) {
      console.log('Moderation report error:', submitError);
      setError('We couldn’t submit your report. Check your connection and try again.');
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Why are you reporting {route.params?.displayName || 'this user'}?</Text>
        <Text style={styles.subtitle}>Your report is private and will be reviewed by our team.</Text>

        <View style={styles.reasons}>
          {REASONS.map(([value, label]) => {
            const selected = reason === value;
            return (
              <TouchableOpacity key={value} style={[styles.reasonRow, selected && styles.reasonSelected]} disabled={submitting} onPress={() => { setReason(value); setError(''); }} accessibilityRole="radio" accessibilityState={{ checked: selected }}>
                <Text style={styles.reasonText}>{label}</Text>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={23} color={selected ? colors.primary : colors.subtle} />
              </TouchableOpacity>
            );
          })}
        </View>

        {(
          <>
            <Text style={styles.label}>What happened?{reason === 'other' ? ' (required)' : ' (optional)'}</Text>
            <TextInput editable={!submitting} selectionColor={colors.primary} accessibilityLabel="Report details" value={details} onChangeText={(value) => { setDetails(value); setError(''); }} maxLength={500} multiline textAlignVertical="top" style={styles.input} placeholder="Tell us what happened." />
            <Text style={styles.counter}>{details.length}/500</Text>
          </>
        )}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.submitButton, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
          <SteadyButtonContent label="Submit report" busy={submitting} busyLabel="Submitting report…" />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.ink, fontSize: 23, lineHeight: 30, fontFamily: fonts.heading },
  subtitle: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 20 },
  reasonSelected: { backgroundColor: colors.primarySoft },
  reasons: { marginTop: 22, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  reasonRow: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  reasonText: { flex: 1, paddingVertical: 12, color: colors.ink, fontSize: 16 },
  label: { marginTop: 22, marginBottom: 7, color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 130, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.white, fontSize: 16 },
  counter: { marginTop: 5, color: colors.muted, fontSize: 12, textAlign: 'right' },
  error: { marginTop: 10, color: '#B42318', fontSize: 14 },
  submitButton: { minHeight: 54, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
