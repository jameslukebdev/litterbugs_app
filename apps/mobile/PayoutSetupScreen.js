import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createPayoutDashboardLink, createPayoutOnboardingLink, loadPayoutStatus } from './lib/funding';

const PAYOUT_ONBOARDING_RETURN_URL = 'litterbugs://stripe-onboarding-return';

export default function PayoutSetupScreen() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [eligibleConfirmed, setEligibleConfirmed] = useState(false);

  const refresh = async () => {
    try {
      const next = await loadPayoutStatus();
      setStatus(next);
    } catch (error) {
      setStatus({ onboardingStatus: 'not_started', payoutsEnabled: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const openSetup = async () => {
    try {
      setBusy(true);
      const link = status?.payoutsEnabled
        ? await createPayoutDashboardLink()
        : await createPayoutOnboardingLink();
      if (status?.payoutsEnabled) {
        await WebBrowser.openBrowserAsync(link.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
      } else {
        await WebBrowser.openAuthSessionAsync(link.url, PAYOUT_ONBOARDING_RETURN_URL, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
      }
      await refresh();
    } catch (error) {
      Alert.alert('Payout setup unavailable', error.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2F7D32" /></View>;
  const enabled = status?.payoutsEnabled === true;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
      <View style={[styles.icon, enabled && styles.iconEnabled]}>
        <Ionicons name={enabled ? 'checkmark' : 'wallet-outline'} size={35} color={enabled ? '#FFFFFF' : '#2F7D32'} />
      </View>
      <Text style={styles.title}>{enabled ? 'Payouts are ready' : 'Set up cleanup payouts'}</Text>
      <Text style={styles.text}>
        {enabled
          ? 'You can claim funded cleanups. Stripe sends rewards to your connected payout account.'
          : 'Stripe securely verifies your identity and bank details. Litterbugs never stores that information.'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Before you continue</Text>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color="#2F7D32" /><Text style={styles.rowText}>You must be at least 18 years old.</Text></View>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color="#2F7D32" /><Text style={styles.rowText}>Cleanup payouts are currently available to eligible U.S. cleaners.</Text></View>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color="#2F7D32" /><Text style={styles.rowText}>Your shown reward is the exact amount Litterbugs transfers.</Text></View>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color="#2F7D32" /><Text style={styles.rowText}>You are responsible for determining and reporting taxes on cleanup rewards; Stripe or Litterbugs may provide required tax forms.</Text></View>
      </View>

      {!enabled ? (
        <TouchableOpacity
          style={styles.confirmRow}
          onPress={() => setEligibleConfirmed((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: eligibleConfirmed }}
        >
          <Ionicons name={eligibleConfirmed ? 'checkbox' : 'square-outline'} size={24} color="#2F7D32" />
          <Text style={styles.confirmText}>I confirm that I am at least 18 years old and eligible to receive payouts in the United States.</Text>
        </TouchableOpacity>
      ) : null}

      {!enabled ? (
        <TouchableOpacity style={[styles.button, (busy || !eligibleConfirmed) && styles.disabled]} onPress={openSetup} disabled={busy || !eligibleConfirmed}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{status?.onboardingStatus === 'pending' ? 'Continue Stripe setup' : 'Set up with Stripe'}</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.secondaryButton} onPress={openSetup} disabled={busy}>
          <Text style={styles.secondaryText}>Review payout details</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' },
  content: { flexGrow: 1, alignItems: 'center', padding: 24, backgroundColor: '#F5F6F7' },
  icon: { width: 76, height: 76, marginTop: 18, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3EEE4' },
  iconEnabled: { backgroundColor: '#2F7D32' },
  title: { marginTop: 19, color: '#202428', fontSize: 27, fontWeight: '900', textAlign: 'center' },
  text: { maxWidth: 380, marginTop: 10, color: '#667078', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  card: { width: '100%', maxWidth: 420, marginTop: 26, padding: 18, borderRadius: 17, backgroundColor: '#FFFFFF' },
  cardTitle: { color: '#30363B', fontSize: 17, fontWeight: '900' },
  row: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  rowText: { flex: 1, color: '#59636A', fontSize: 14, lineHeight: 20 },
  confirmRow: { width: '100%', maxWidth: 420, marginTop: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  confirmText: { flex: 1, color: '#4F5C63', fontSize: 14, lineHeight: 20 },
  button: { width: '100%', maxWidth: 420, minHeight: 54, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#2F7D32' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryButton: { minHeight: 52, marginTop: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2F7D32', borderRadius: 14 },
  secondaryText: { color: '#2F7D32', fontSize: 16, fontWeight: '900' },
  disabled: { opacity: 0.6 },
});
