import { userMessage } from './lib/userMessage';
import { useSession } from './lib/session';
import { withTimeout } from './lib/asyncTimeout';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createPayoutDashboardLink, createPayoutOnboardingLink, loadPayoutStatus } from './lib/funding';
import {
  cancelPayoutWorkflow,
  isPayoutConnectionReady,
  markPayoutWorkflowReady,
  payoutWorkflowCopy,
  waitForPayoutConnection,
} from './lib/payoutWorkflowGate';
import BrandedLoadingState, { LoadingButtonContent } from './BrandedLoadingState';

const PAYOUT_ONBOARDING_RETURN_URL = 'litterbugs://stripe-onboarding-return';

export default function PayoutSetupScreen(props) {
  const { user } = useSession();
  return <PayoutSetupController key={`${user?.id ?? "guest"}:${props.route?.params?.workflowToken ?? "overview"}`} {...props} />;
}
function PayoutSetupController({ navigation, route }) {
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const insets = useSafeAreaInsets();
  const workflowToken = route?.params?.workflowToken ?? null;
  const workflowCopy = payoutWorkflowCopy(route?.params?.workflowKind);
  const workflowCompletedRef = useRef(false);
  const connectionSuccessAlertRef = useRef(false);
  const [statusError, setStatusError] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const refreshBusy = useRef(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [eligibleConfirmed, setEligibleConfirmed] = useState(false);

  const refresh = useCallback(async () => {
    if (refreshBusy.current) return;
    refreshBusy.current = true;
    try {
      const next = await withTimeout(loadPayoutStatus(), 12000, 'Payout status is taking longer than expected.');
      if (!mounted.current) return;
      setStatus(next);
      setStatusError(false);
      if (next?.payoutsEnabled) setWaiting(false);
    } catch (error) {
      setStatusError(true);
    } finally {
      refreshBusy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [waiting, refresh]);

  useEffect(() => navigation.addListener('beforeRemove', () => {
    if (workflowToken && !workflowCompletedRef.current) {
      cancelPayoutWorkflow(workflowToken);
    }
  }), [navigation, workflowToken]);

  const completePendingWorkflow = useCallback(() => {
    if (!mounted.current || !workflowToken || workflowCompletedRef.current) return;
    workflowCompletedRef.current = true;
    markPayoutWorkflowReady(workflowToken);
    navigation.goBack();
  }, [navigation, workflowToken]);

  useEffect(() => {
    if (
      status?.payoutsEnabled !== true
      || connectionSuccessAlertRef.current
    ) return;
    completePendingWorkflow();
  }, [completePendingWorkflow, status?.payoutsEnabled]);

  const openSetup = async () => {
    try {
      setBusy(true);
      const link = status?.payoutsEnabled
        ? await createPayoutDashboardLink()
        : await createPayoutOnboardingLink();
      if (!mounted.current) return;
      if (status?.payoutsEnabled) {
        await WebBrowser.openBrowserAsync(link.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
        await refresh();
      } else {
        const result = await WebBrowser.openAuthSessionAsync(link.url, PAYOUT_ONBOARDING_RETURN_URL, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
        if (!mounted.current) return;
        if (result.type === 'success') {
          const nextStatus = await waitForPayoutConnection(loadPayoutStatus);
          if (!mounted.current) return;
          const connected = isPayoutConnectionReady(nextStatus);
          if (connected) connectionSuccessAlertRef.current = true;
          if (nextStatus) setStatus(nextStatus);
          if (connected) {
            Alert.alert(
              'Ready to receive cleanup rewards',
              workflowToken
                ? 'Your payout account is ready. Continue to return to the litter report and finish claiming the cleanup.'
                : 'Your payout account is ready to receive cleanup rewards.',
              [{
                text: workflowToken ? 'Continue to cleanup' : 'Done',
                onPress: () => {
                  connectionSuccessAlertRef.current = false;
                  completePendingWorkflow();
                },
              }],
              { cancelable: false }
            );
          } else {
            setWaiting(true);
            Alert.alert(
              'Your payout details are being reviewed',
              'Your information was received. Stay on this screen and try again shortly if Litterbugs does not return to the cleanup automatically.'
            );
          }
        } else {
          await refresh();
        }
      }
    } catch (error) {
      Alert.alert('Payout setup unavailable', userMessage(error, 'Payout setup is unavailable. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !status) return <BrandedLoadingState title="Checking payout setup…" message="" />;
  const enabled = status?.payoutsEnabled === true;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
      {statusError || waiting ? <View style={styles.card} accessibilityLiveRegion="polite"><Text style={styles.cardTitle}>{statusError ? 'Payout status unavailable' : 'Payout setup in review'}</Text><Text style={styles.rowText}>{statusError ? 'Your existing setup is unchanged. Retry to check its latest status.' : 'We’re checking automatically. You can return here from your profile at any time.'}</Text><TouchableOpacity style={styles.secondaryButton} onPress={refresh} accessibilityRole="button"><Text style={styles.secondaryText}>Refresh status</Text></TouchableOpacity></View> : null}
      <View style={[styles.icon, enabled && styles.iconEnabled]}>
        <Ionicons name={enabled ? 'checkmark' : 'wallet-outline'} size={35} color={enabled ? '#FFFFFF' : '#2F7D32'} />
      </View>
      <Text style={styles.title}>
        {enabled ? 'Payouts are ready' : workflowCopy?.title || 'Set up individual payouts'}
      </Text>
      <Text style={styles.text}>
        {enabled
          ? 'You can claim funded cleanups. Stripe sends rewards to your connected payout account.'
          : workflowCopy?.text || 'Set up as an individual cleaner. Stripe securely verifies your identity and bank details, and Litterbugs never stores that information.'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Before you continue</Text>
        <View style={styles.row}><Ionicons name="person-circle-outline" size={20} color="#2F7D32" /><Text style={styles.rowText}>No business or LLC is required. Litterbugs creates an individual Stripe payout profile for you.</Text></View>
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
        <TouchableOpacity style={[styles.button, (busy || !eligibleConfirmed || !status) && styles.disabled]} onPress={openSetup} disabled={busy || !eligibleConfirmed || !status}>
          {busy ? <LoadingButtonContent label="Opening Stripe…" /> : <Text style={styles.buttonText}>{status?.onboardingStatus === 'pending' ? 'Continue Stripe setup' : 'Set up with Stripe'}</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.secondaryButton} onPress={openSetup} disabled={busy}>
          {busy ? <LoadingButtonContent label="Opening Stripe…" color="#2F7D32" /> : <Text style={styles.secondaryText}>Review payout details</Text>}
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
