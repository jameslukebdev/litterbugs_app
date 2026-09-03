import { useState } from 'react';
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

import { LoadingButtonContent } from './BrandedLoadingState';
import { useSession } from './lib/session';
import { supabase } from './lib/supabase';

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

  const submit = async () => {
    if (!reason) {
      setError('Choose a reason.');
      return;
    }
    if (reason === 'other' && !details.trim()) {
      setError('Add a short explanation for Other.');
      return;
    }

    try {
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
      Alert.alert('Report received', 'Thank you. Your report was submitted for review.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (submitError) {
      console.log('Moderation report error:', submitError);
      setError('We couldn’t submit your report. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Why are you reporting {route.params?.displayName || 'this user'}?</Text>
        <Text style={styles.subtitle}>Your report is private and will enter the moderation queue.</Text>

        <View style={styles.reasons}>
          {REASONS.map(([value, label]) => {
            const selected = reason === value;
            return (
              <TouchableOpacity key={value} style={styles.reasonRow} onPress={() => { setReason(value); setError(''); }} accessibilityRole="radio" accessibilityState={{ checked: selected }}>
                <Text style={styles.reasonText}>{label}</Text>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={23} color={selected ? '#2F7D32' : '#8B949A'} />
              </TouchableOpacity>
            );
          })}
        </View>

        {reason === 'other' ? (
          <>
            <Text style={styles.label}>Details</Text>
            <TextInput value={details} onChangeText={(value) => { setDetails(value); setError(''); }} maxLength={500} multiline textAlignVertical="top" style={styles.input} placeholder="Tell us what happened." />
            <Text style={styles.counter}>{details.length}/500</Text>
          </>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.submitButton, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
          {submitting ? <LoadingButtonContent label="Submitting report…" /> : <Text style={styles.submitText}>Submit report</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  content: { padding: 22, paddingBottom: 40 },
  title: { color: '#262C30', fontSize: 23, lineHeight: 30, fontWeight: '800' },
  subtitle: { marginTop: 8, color: '#6C757C', fontSize: 14, lineHeight: 20 },
  reasons: { marginTop: 22, overflow: 'hidden', borderRadius: 15, backgroundColor: '#FFFFFF' },
  reasonRow: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E3E5' },
  reasonText: { color: '#30363B', fontSize: 16 },
  label: { marginTop: 22, marginBottom: 7, color: '#333A3F', fontSize: 14, fontWeight: '800' },
  input: { minHeight: 130, padding: 14, borderWidth: 1, borderColor: '#CBD1D5', borderRadius: 12, backgroundColor: '#FFFFFF', fontSize: 16 },
  counter: { marginTop: 5, color: '#7A8288', fontSize: 12, textAlign: 'right' },
  error: { marginTop: 10, color: '#B42318', fontSize: 14 },
  submitButton: { minHeight: 54, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#2F7D32' },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
