import { userMessage } from './lib/userMessage';
import { useSession } from './lib/session';
import { withTimeout } from './lib/asyncTimeout';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConnectAccountOnboarding, ConnectComponentsProvider, loadConnectAndInitialize } from '@stripe/stripe-react-native';

import { createPayoutDashboardLink, createPayoutOnboardingLink, createPayoutSession, loadPayoutStatus } from './lib/funding';
import { trackParticipation } from './lib/analytics';
import { payoutSetupPresentation } from './lib/payoutSetupPresentation';
import {
  cancelPayoutWorkflow,
  isPayoutConnectionReady,
  markPayoutWorkflowReady,
  payoutWorkflowCopy,
  waitForPayoutConnection,
} from './lib/payoutWorkflowGate';
import { colors, fonts } from './lib/theme';
import BrandBug from './components/BrandBug';


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
  // Stripe's setup form, shown inside the app. Null while it is closed.
  const [connect, setConnect] = useState(null);
  const setupNotice = payoutSetupPresentation({ status, error: statusError, waiting });
  const checkingSetup = setupNotice?.kind === 'pending';
  const enabled = status?.payoutsEnabled === true;
  const updatingRequiredDetails = enabled && setupNotice?.kind === 'action_required';
  const openingOnboarding = !enabled || updatingRequiredDetails;
  // Pressing the button is the confirmation: the line under it says so. One tap fewer.
  const needsEligibilityConfirmation = openingOnboarding && status?.age18Confirmed !== true;
  const eligibilityReady = true;

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

  // After the member leaves Stripe's form: check the account and say what happened.
  const finishSetup = async () => {
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
            : 'Approved cleanups and reporter earnings can now be paid out to you.',
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
  };

  const openSetup = async () => {
    if (busy || loading || statusError || !status || !eligibilityReady) return;
    try {
      setBusy(true);
      if (openingOnboarding) {
        trackParticipation('payout', 'started');
        // Prefer Stripe's form inside the app; fall back to Stripe's hosted page.
        const session = await createPayoutSession();
        if (!mounted.current) return;
        if (session) {
          let first = session.clientSecret;
          const instance = loadConnectAndInitialize({
            publishableKey: session.publishableKey,
            // Stripe asks again when a session runs out; hand over the first one once.
            fetchClientSecret: async () => {
              if (first) { const secret = first; first = null; return secret; }
              return (await createPayoutSession())?.clientSecret;
            },
            appearance: { variables: { colorPrimary: colors.primary, colorText: colors.ink, colorBackground: colors.white, borderRadius: '14px' } },
          });
          setConnect(instance);
          return;
        }
      }
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
        if (result.type === 'success') await finishSetup();
        else await refresh();
      }
    } catch (error) {
      Alert.alert('Payout setup unavailable', userMessage(error, 'Payout setup is unavailable. Please try again.'));
    } finally {
      setBusy(false);
    }
  };


  const closeConnect = async () => {
    setConnect(null);
    setBusy(true);
    try { await finishSetup(); } catch { await refresh(); } finally { if (mounted.current) setBusy(false); }
  };

  return (
    <>
    {connect ? (
      <ConnectComponentsProvider connectInstance={connect}>
        <ConnectAccountOnboarding
          title="Payout setup"
          // Ask only for what Stripe needs now, not what it might need later.
          collectionOptions={{ fields: 'currently_due', futureRequirements: 'omit' }}
          onExit={closeConnect}
          onLoadError={() => { setConnect(null); Alert.alert('Payout setup unavailable', 'Stripe’s form couldn’t load. Check your connection and try again.'); }}
        />
      </ConnectComponentsProvider>
    ) : null}
    <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
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
      {/* Website payout setup: the caterpillar (the cleaner) beside "Get paid for cleanups". */}
      <BrandBug kind={enabled ? 'bee' : 'caterpillar'} size={40} />
      <Text style={styles.title}>
        {enabled ? 'Payouts are ready' : workflowCopy?.title || 'Get paid for cleanups'}
      </Text>
      <Text style={styles.text}>
        {enabled
          ? 'Use this account for cleanup and reporter rewards. Stripe sends rewards to your connected payout account.'
          : workflowCopy?.text || 'Rewards go straight to your bank. Setup takes about 3 minutes and happens right here, on a secure form from Stripe.'}
      </Text>

      {/* What to have ready, so nobody starts and then has to stop and look for something. */}
      {!enabled ? (
        <View style={styles.steps}>
          <Text style={styles.readyTitle}>Have these ready</Text>
          {[
            ['phone-portrait-outline', 'Your phone', 'Stripe texts you a code.'],
            ['person-outline', 'Your details', 'Legal name, date of birth and address. Stripe may ask for the last 4 digits of your SSN.'],
            ['card-outline', 'Where to pay you', 'Your bank account or debit card.'],
          ].map(([icon, label, detail]) => (
            <View key={label} style={styles.step}>
              <Ionicons name={icon} size={22} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepLabel}>{label}</Text>
                <Text style={styles.stepDetail}>{detail}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      </> : null}


      <TouchableOpacity
        style={[enabled ? styles.secondaryButton : styles.button, (!status || loading || statusError || !eligibilityReady) && styles.disabled]}
        onPress={openSetup}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy || loading || statusError || !status || !eligibilityReady }}
        disabled={busy || loading || statusError || !status || !eligibilityReady}
      >
        <Text style={enabled ? styles.secondaryText : styles.buttonText}>{updatingRequiredDetails ? 'Update payout details' : enabled ? 'Review payout details' : setupNotice?.kind === 'action_required' ? 'Continue payout setup' : checkingSetup ? 'Review payout setup' : 'Set up payouts'}</Text>
        {showBusy ? <ActivityIndicator size="small" color={enabled ? colors.primary : colors.white} style={styles.buttonSpinner} /> : null}
      </TouchableOpacity>
      {needsEligibilityConfirmation ? <Text style={styles.confirmNote}>By continuing, you confirm you are at least 18 and can be paid in the United States.</Text> : null}
      <View style={styles.trustRow}><Ionicons name="lock-closed-outline" size={13} color={colors.muted} /><Text style={styles.trustText}><Text style={{ fontWeight: '800', color: colors.green }}>Secured by Stripe.</Text> Stripe checks your identity and sends your payouts. Litterbugs never receives your full bank-account number.</Text></View>
      {!enabled ? <View style={[styles.card, styles.expectations]}>
        <Text style={styles.cardTitle}>What to expect</Text>
        <View style={styles.row}><Ionicons name="person-circle-outline" size={20} color={colors.primary} /><Text style={styles.rowText}>No business or LLC is required. You’ll set up a personal payout account with Stripe.</Text></View>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} /><Text style={styles.rowText}>You do not need a website. Your Litterbugs reward activity is described for you; review it when Stripe calls it a “product description.”</Text></View>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} /><Text style={styles.rowText}>Your shown reward is the exact amount Litterbugs transfers.</Text></View>
        <View style={styles.row}><Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} /><Text style={styles.rowText}>You are responsible for determining and reporting taxes on cleanup rewards; Stripe or Litterbugs may provide required tax forms.</Text></View>
      </View> : null}


    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist },
  content: { flexGrow: 1, alignItems: 'stretch', padding: 20, backgroundColor: colors.white },
  title: { marginTop: 12, color: colors.ink, fontSize: 24, lineHeight: 29, fontFamily: fonts.heading },
  text: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { width: '100%', maxWidth: 420, marginTop: 0, padding: 16, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  cardTitle: { color: colors.ink, fontSize: 17, fontFamily: fonts.heading },
  notice: { marginBottom: 0 },
  expectations: { marginTop: 24 },
  noticeText: { marginTop: 8, color: colors.body, fontSize: 14, lineHeight: 20 },
  requirementText: { marginTop: 8, color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  row: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  rowText: { flex: 1, color: colors.body, fontSize: 14, lineHeight: 20 },
  confirmRow: { width: '100%', maxWidth: 420, marginTop: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  confirmNote: { marginTop: 10, color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  confirmText: { flex: 1, color: colors.body, fontSize: 14, lineHeight: 20 },
  buttonSpinner: { position: 'absolute', right: 12 },
  statusCheck: { minHeight: 24, justifyContent: 'center' },
  statusCheckText: { color: colors.muted, fontSize: 12 },
  trustRow: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  trustText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 },
  steps: { marginTop: 18, gap: 12 },
  readyTitle: { color: colors.ink, fontSize: 15, fontFamily: fonts.heading },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  stepNumberCurrent: { borderColor: colors.green },
  stepNumberText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  stepNumberTextCurrent: { color: colors.green },
  stepLabel: { marginTop: 0, color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  stepDetail: { marginTop: 2, color: colors.muted, fontSize: 13, lineHeight: 19 },
  button: { width: '100%', maxWidth: 420, minHeight: 54, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  secondaryButton: { minHeight: 52, marginTop: 22, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white },
  secondaryText: { color: colors.primaryDark, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
