import { userMessage } from './lib/userMessage';
import { useSession } from './lib/session';
import { withTimeout } from './lib/asyncTimeout';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createPayoutDashboardLink, createPayoutOnboardingLink, loadPayoutStatus } from './lib/funding';
import { payoutSetupPresentation } from './lib/payoutSetupPresentation';
import {
  cancelPayoutWorkflow,
  isPayoutConnectionReady,
  markPayoutWorkflowReady,
  payoutWorkflowCopy,
  waitForPayoutConnection,
} from './lib/payoutWorkflowGate';


const PAYOUT_ONBOARDING_RETURN_URL = 'litterbugs://stripe-onboarding-return';
const PAYOUT_BROWSER_OPTIONS = {
  presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
  // Android's default separate task sets FLAG_ACTIVITY_NO_HISTORY. Keeping
  // the browser in our task preserves its form when members check SMS codes.
  createTask: false,
};

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
  const [showBusy, setShowBusy] = useState(false);
  useEffect(() => {
    setShowBusy(false);
    if (!busy) return;
    const timer = setTimeout(() => setShowBusy(true), 400);
    return () => clearTimeout(timer);
  }, [busy]);
  const [eligibleConfirmed, setEligibleConfirmed] = useState(false);
  const setupNotice = payoutSetupPresentation({ status, error: statusError, waiting });
  const checkingSetup = setupNotice?.kind === 'pending';
  const enabled = status?.payoutsEnabled === true;
  const updatingRequiredDetails = enabled && setupNotice?.kind === 'action_required';
  const openingOnboarding = !enabled || updatingRequiredDetails;
  const needsEligibilityConfirmation = openingOnboarding && status?.age18Confirmed !== true;
  const eligibilityReady = !needsEligibilityConfirmation || eligibleConfirmed;

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
      if (mounted.current) setStatusError(true);
    } finally {
      refreshBusy.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  useEffect(() => {
    if (!checkingSetup) return undefined;
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [checkingSetup, refresh]);

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
    if (busy || loading || statusError || !status || !eligibilityReady) return;
    try {
      setBusy(true);
      const link = openingOnboarding
        ? await createPayoutOnboardingLink()
        : await createPayoutDashboardLink();
      if (!mounted.current) return;
      if (!openingOnboarding) {
        await WebBrowser.openBrowserAsync(link.url, PAYOUT_BROWSER_OPTIONS);
        await refresh();
      } else {
        const result = await WebBrowser.openAuthSessionAsync(link.url, PAYOUT_ONBOARDING_RETURN_URL, PAYOUT_BROWSER_OPTIONS);
        if (!mounted.current) return;
        if (result.type === 'success') {
          const nextStatus = await waitForPayoutConnection(loadPayoutStatus);
          if (!mounted.current) return;
          const connected = isPayoutConnectionReady(nextStatus);
          if (connected) connectionSuccessAlertRef.current = true;
          if (nextStatus) setStatus(nextStatus);
          if (connected) {
            Alert.alert(
              'Ready to receive rewards',
              workflowToken
                ? 'Your payout account is ready. Continue to return to the litter report and finish claiming the cleanup.'
                : 'Your payout account is ready for cleanup and reporter rewards.',
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
            const notice = payoutSetupPresentation({ status: nextStatus, waiting: true });
            Alert.alert(
              notice.title,
              [notice.detail, ...notice.requirements.map(item => `• ${item}`)].join('\n\n')
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


  return (
    <ScrollView style={{ backgroundColor: '#FFFFFF' }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
      {setupNotice ? (
        <View style={[styles.card, styles.notice]} accessibilityLiveRegion="polite">
          <Text style={styles.cardTitle}>{setupNotice.title}</Text>
          <Text style={styles.noticeText}>{setupNotice.detail}</Text>
          {setupNotice.requirements.map(item => <Text key={item} style={styles.requirementText}>• {item}</Text>)}
          <TouchableOpacity style={styles.secondaryButton} onPress={refresh} disabled={busy || loading} accessibilityRole="button">
            <Text style={styles.secondaryText}>Refresh status</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {!setupNotice ? <>
      <View style={[styles.icon, enabled && styles.iconEnabled]}>
        <Ionicons name={enabled ? 'checkmark' : 'wallet-outline'} size={35} color={enabled ? '#FFFFFF' : '#2F7D32'} />
      </View>
      <Text style={styles.title}>
        {enabled ? 'Payouts are ready' : workflowCopy?.title || 'Receive rewards'}
      </Text>
      <Text style={styles.text}>
        {enabled
          ? 'Use this account for cleanup and reporter rewards. Stripe sends rewards to your connected payout account.'
          : workflowCopy?.text || 'Receive cleanup and reporter rewards in your bank account. We’ll open a secure form with Stripe to verify your identity and bank details. Have your phone nearby for a verification code.'}
      </Text>

      </> : null}

      {needsEligibilityConfirmation ? (
        <TouchableOpacity
          disabled={busy || loading || statusError}
          style={styles.confirmRow}
          onPress={() => setEligibleConfirmed((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: eligibleConfirmed }}
        >
          <Ionicons name={eligibleConfirmed ? 'checkbox' : 'square-outline'} size={24} color="#2F7D32" />
          <Text style={styles.confirmText}>I confirm that I am at least 18 years old and eligible to receive payouts in the United States.</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[enabled ? styles.secondaryButton : styles.button, (!status || loading || statusError || !eligibilityReady) && styles.disabled]}
        onPress={openSetup}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy || loading || statusError || !status || !eligibilityReady }}
        disabled={busy || loading || statusError || !status || !eligibilityReady}
      >
        <Text style={enabled ? styles.secondaryText : styles.buttonText}>{updatingRequiredDetails ? 'Update payout details' : enabled ? 'Review payout details' : setupNotice?.kind === 'action_required' ? 'Continue payout setup' : checkingSetup ? 'Review payout setup' : 'Set up payouts'}</Text>
        {showBusy ? <ActivityIndicator size="small" color={enabled ? '#2F7D32' : '#FFFFFF'} style={styles.buttonSpinner} /> : null}
      </TouchableOpacity>
      <View style={styles.trustRow}><Ionicons name="lock-closed-outline" size={13} color="#6C786F" /><Text style={styles.trustText}>Secure verification and payouts by Stripe</Text></View>
      {!enabled ? <View style={[styles.card, styles.expectations]}>
        <Text style={styles.cardTitle}>What to expect</Text>
        <View style={styles.row}><Ionicons name="person-circle-outline" size={20} color="#2F7D32" /><Text style={styles.rowText}>No business or LLC is required. You’ll set up a personal payout account with Stripe.</Text></View>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color="#2F7D32" /><Text style={styles.rowText}>You do not need a website. Your Litterbugs reward activity is described for you; review it when Stripe calls it a “product description.”</Text></View>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color="#2F7D32" /><Text style={styles.rowText}>Your shown reward is the exact amount Litterbugs transfers.</Text></View>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color="#2F7D32" /><Text style={styles.rowText}>You are responsible for determining and reporting taxes on cleanup rewards; Stripe or Litterbugs may provide required tax forms.</Text></View>
      </View> : null}


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' },
  content: { flexGrow: 1, alignItems: 'stretch', padding: 20, backgroundColor: '#FFFFFF' },
  icon: { width: 52, height: 52, marginTop: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3EEE4' },
  iconEnabled: { backgroundColor: '#2F7D32' },
  title: { marginTop: 14, color: '#26332B', fontSize: 24, lineHeight: 30, fontWeight: '600' },
  text: { marginTop: 8, color: '#66736A', fontSize: 14, lineHeight: 21 },
  card: { width: '100%', maxWidth: 420, marginTop: 0, padding: 16, borderRadius: 14, backgroundColor: '#F5F8F5', borderWidth: 1, borderColor: '#E1EAE2' },
  cardTitle: { color: '#30363B', fontSize: 17, fontWeight: '600' },
  notice: { marginBottom: 0 },
  expectations: { marginTop: 24 },
  noticeText: { marginTop: 8, color: '#59636A', fontSize: 14, lineHeight: 20 },
  requirementText: { marginTop: 8, color: '#30363B', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  row: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  rowText: { flex: 1, color: '#59636A', fontSize: 14, lineHeight: 20 },
  confirmRow: { width: '100%', maxWidth: 420, marginTop: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  confirmText: { flex: 1, color: '#4F5C63', fontSize: 14, lineHeight: 20 },
  buttonSpinner: { position: 'absolute', right: 12 },
  statusCheck: { minHeight: 24, justifyContent: 'center' },
  statusCheckText: { color: '#68776D', fontSize: 12 },
  trustRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  trustText: { color: '#6C786F', fontSize: 12, lineHeight: 18 },
  button: { width: '100%', maxWidth: 420, minHeight: 54, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#2F7D32' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { minHeight: 52, marginTop: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2F7D32', borderRadius: 14 },
  secondaryText: { color: '#2F7D32', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
