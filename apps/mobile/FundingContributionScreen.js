import { userMessage } from './lib/userMessage';
import FeeExplanationLabel from './components/FeeExplanationLabel';
import { useHeaderHeight } from '@react-navigation/elements';
import { reconcileContribution } from './lib/reconcileContribution';
import { replaceUnpaidContribution } from './lib/replaceUnpaidContribution';
import { useSession } from './lib/session';
import { supabase } from './lib/supabase';
import { loadPaymentAttempt, savePaymentAttempt, clearPaymentAttempt } from './lib/contributionRecovery';
import { useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import {
  initStripe,
  initPaymentSheet,
  presentPaymentSheet,
  retrievePaymentIntent,
} from '@stripe/stripe-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createCleanupContribution,
  formatUsd,
  loadCleanupFeatureFlags,
} from './lib/funding';
import { calculatePlatformFee, parseContributionAmount } from './lib/fundingMath';
import { paymentSheetConfiguration, stripeInitializationConfiguration } from './lib/paymentConfiguration';
import { evaluatePaymentConfirmation } from './lib/paymentConfirmation';
import {
  fundingAvailabilityPresentation,
  fundingReviewCompletionPresentation,
  shouldRefreshFundingEligibility,
} from './lib/fundingAvailability';
import { useReports } from './lib/reports';
import { withTimeout } from './lib/asyncTimeout';
import {
  clearPendingReportFunding,
  loadPendingReportFunding,
  savePendingReportFunding,
} from './lib/pendingReportFunding';
import FundingAvailabilityNotice from './components/FundingAvailabilityNotice';
import SteadyButtonContent from './components/SteadyButtonContent';
import { canEditOrDeleteReport } from './lib/reportAccess';
import { useIsFocused } from '@react-navigation/native';

export default function FundingContributionScreen(props) {
  const { user } = useSession();
  return <FundingContributionController key={`${user?.id ?? "guest"}:${props.route?.params?.reportId}`} {...props} />;
}
function FundingContributionController({ navigation, route }) {
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { user } = useSession();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryError, setRecoveryError] = useState(null);
  const attemptRef = useRef(null);
  const payLock = useRef(false);
  const reconciliationRef = useRef(null);
  const reportId = route?.params?.reportId;
  const fromReportCreation = route?.params?.fromReportCreation === true;
  const initialAmount = route?.params?.initialAmount;
  const { getReportById, refreshReports } = useReports();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [report, setReport] = useState(null);
  const [flags, setFlags] = useState(null);
  const hasInitialAmount = typeof initialAmount === 'string' && initialAmount.trim();
  const [amount, setAmount] = useState(hasInitialAmount ? initialAmount : '');
  const [pendingAmountLoaded, setPendingAmountLoaded] = useState(Boolean(hasInitialAmount));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const [paying, setPaying] = useState(false);
  const [showPaymentSpinner, setShowPaymentSpinner] = useState(false);
  useEffect(() => {
    if (!paying) {
      setShowPaymentSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowPaymentSpinner(true), 400);
    return () => clearTimeout(timer);
  }, [paying]);
  const [receipt, setReceipt] = useState(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const previousFundingEligibility = useRef(null);
  const fundingEligibilityInitialized = useRef(false);
  const principalCents = parseContributionAmount(amount);
  const feeCents = principalCents == null ? null : calculatePlatformFee(principalCents);

  const reconcileAttempt = ({ preserveAmount = false } = {}) => {
    if (reconciliationRef.current) return reconciliationRef.current;
    const run = async () => {
    setRecoveryError(null);
    const attempt = await loadPaymentAttempt(user.id, reportId);
    if (!mounted.current) return 'obsolete';
    attemptRef.current = attempt;
    if (!attempt) return 'none';
    if (!preserveAmount) setAmount(String(attempt.principalAmountCents / 100));
    const result = await reconcileContribution({
      attempt,
      findContribution: async (requestId) => {
        const { data, error } = await withTimeout(supabase.from('cleanup_contributions')
          .select('id,status,principal_amount_cents,total_amount_cents')
          .eq('contributor_id', user.id).eq('client_request_id', requestId).maybeSingle(), 12000, 'Payment status is taking longer than expected.');
        if (error) throw error;
        return data;
      },
      retrieveIntent: async (intent) => {
        await initStripe({ publishableKey: intent.publishableKey, urlScheme: 'litterbugs' });
        return retrievePaymentIntent(intent.paymentIntentClientSecret);
      },
      saveAttempt: (next) => savePaymentAttempt(user.id, reportId, next, { updating: true }),
      clearAttempt: () => clearPaymentAttempt(user.id, reportId, attempt.clientRequestId),
    });
    if (!mounted.current) return 'obsolete';
    attemptRef.current = result.attempt;
    setConfirmationPending(result.attempt?.phase === 'submitted');
    if (result.state === 'received') {
      setReceipt({ principalAmountCents: result.contribution.principal_amount_cents, totalAmountCents: result.contribution.total_amount_cents });
    } else if (result.state === 'refund' || result.state === 'failed') {
      setRecoveryError(result.state === 'refund' ? 'The previous contribution is being returned. See Payment activity for its status.' : 'Your previous payment did not complete. You can try again.');
    }
    return result.state;
    };
    reconciliationRef.current = run().finally(() => { reconciliationRef.current = null; });
    return reconciliationRef.current;
  };
  useEffect(() => {
    let active = true;
    reconcileAttempt().catch(() => { if (active) setRecoveryError('We couldn’t check your previous payment. Retry before continuing.'); })
      .finally(() => { if (active) setRecoveryReady(true); });
    return () => { active = false; };
  }, [user?.id, reportId]);
  useEffect(() => {
    if (!confirmationPending) return undefined;
    const timer = setInterval(() => reconcileAttempt().catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [confirmationPending, user?.id, reportId]);

  useEffect(() => {
    let active = true;
    if (hasInitialAmount) {
      savePendingReportFunding(reportId, initialAmount).catch((error) => {
        console.log('Pending report funding save error:', error);
      });
      return undefined;
    }

    loadPendingReportFunding(reportId)
      .then((savedAmount) => {
        if (active && !attemptRef.current) setAmount(savedAmount ?? '25');
      })
      .catch((error) => {
        console.log('Pending report funding load error:', error);
        if (active && !attemptRef.current) setAmount('25');
      })
      .finally(() => {
        if (active) setPendingAmountLoaded(true);
      });

    return () => { active = false; };
  }, [hasInitialAmount, initialAmount, reportId]);

  useEffect(() => {
    if (!fromReportCreation || !pendingAmountLoaded || !principalCents) return;
    savePendingReportFunding(reportId, amount).catch((error) => {
      console.log('Pending report funding update error:', error);
    });
  }, [amount, fromReportCreation, pendingAmountLoaded, principalCents, reportId]);

  useEffect(() => {
    if (!isFocused) return undefined;
    let active = true;
    setRefreshing(true);
    setLoadError(null);
    withTimeout(
      Promise.all([getReportById(reportId), loadCleanupFeatureFlags()]),
      12_000,
      'Checking this report is taking longer than expected.',
    )
      .then(([nextReport, nextFlags]) => {
        if (!active) return;
        setReport(nextReport);
        setFlags(nextFlags);
      })
      .catch((error) => {
        if (active) setLoadError(userMessage(error, 'We couldn’t update your contribution. View payment history before paying again.'));
      })
      .finally(() => {
        if (active) { setLoading(false); setRefreshing(false); }
      });
    return () => { active = false; };
  }, [getReportById, reloadKey, reportId, isFocused]);

  useEffect(() => {
    const shouldRecheck = isFocused
      && !loading
      && !loadError
      && shouldRefreshFundingEligibility(report);
    if (!shouldRecheck) return undefined;

    let active = true;
    const interval = setInterval(() => {
      getReportById(reportId)
        .then((nextReport) => {
          if (active) setReport(nextReport);
        })
        .catch(() => {
          // Keep the current, useful status on screen. The manual retry remains available.
        });
    }, 5_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isFocused, getReportById, loadError, loading, report?.funding_eligibility, reportId]);

  useEffect(() => {
    if (loading || loadError || !report) return;

    if (fundingEligibilityInitialized.current) {
      const presentation = fundingReviewCompletionPresentation(
        previousFundingEligibility.current,
        report,
      );
      if (presentation) Alert.alert(presentation.title, presentation.message);
    }

    previousFundingEligibility.current = report.funding_eligibility;
    fundingEligibilityInitialized.current = true;
  }, [loadError, loading, report]);

  const pay = async () => {
    if (!principalCents || payLock.current || !recoveryReady || confirmationPending) return;
    payLock.current = true;
    try {
      setPaying(true);
      // Reconcile first, including after navigation or a process restart.
      const previousState = await reconcileAttempt({ preserveAmount: true });
      if (!mounted.current || ['obsolete', 'received', 'refund', 'failed'].includes(previousState)) return;
      let attempt = attemptRef.current;
      if (attempt?.phase === 'submitted') return;
      attempt = await replaceUnpaidContribution({
        attempt,
        principalCents,
        retrieveIntent: async (savedIntent) => {
          await initStripe({ publishableKey: savedIntent.publishableKey, urlScheme: 'litterbugs' });
          return retrievePaymentIntent(savedIntent.paymentIntentClientSecret);
        },
        clearAttempt: (requestId) => clearPaymentAttempt(user.id, reportId, requestId),
      });
      if (!mounted.current) return;
      attemptRef.current = attempt;
      if (!attempt) {
        attempt = { clientRequestId: Crypto.randomUUID(), principalAmountCents: principalCents, createdAt: Date.now(), phase: 'preparing' };
        await savePaymentAttempt(user.id, reportId, attempt);
        attemptRef.current = attempt;
      }
      if (!attempt.intent && Date.now() - attempt.createdAt > 23 * 60 * 60 * 1000) {
        throw new Error('We haven’t confirmed your previous payment. Open payment history or get help before paying again.');
      }
      const intent = attempt.intent || await createCleanupContribution({ reportId, principalAmountCents: attempt.principalAmountCents, clientRequestId: attempt.clientRequestId });
      attempt = { ...attempt, intent, phase: 'ready' };
      await savePaymentAttempt(user.id, reportId, attempt, { updating: true });
      attemptRef.current = attempt;
      if (!mounted.current) return;
      const applePayEnabled = Platform.OS === 'ios'
        && Constants.expoConfig?.extra?.stripeApplePayEnabled === true;
      await initStripe(stripeInitializationConfiguration({
        publishableKey: intent.publishableKey,
        urlScheme: 'litterbugs',
        applePayEnabled,
        merchantIdentifier: Constants.expoConfig?.extra?.stripeAppleMerchantIdentifier,
      }));
      if (!mounted.current) return;
      const { error: initError } = await initPaymentSheet(paymentSheetConfiguration({
        paymentIntentClientSecret: intent.paymentIntentClientSecret,
        platform: Platform.OS,
        applePayEnabled,
        isDevelopment: __DEV__,
      }));
      if (initError) throw new Error(initError.message);
      if (!mounted.current) return;
      // Persist before presenting: termination while Stripe is open must remain recoverable.
      await savePaymentAttempt(user.id, reportId, { ...attempt, phase: 'submitted' }, { updating: true });
      attemptRef.current = { ...attempt, phase: 'submitted' };
      if (!mounted.current) return;
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          await savePaymentAttempt(user.id, reportId, attempt, { updating: true });
          attemptRef.current = attempt;
          return;
        }
        setConfirmationPending(true);
        throw new Error(paymentError.message);
      }

      const paymentConfirmation = evaluatePaymentConfirmation(
        await retrievePaymentIntent(intent.paymentIntentClientSecret),
      );
      if (!paymentConfirmation.confirmed) {
        setConfirmationPending(true);
        await refreshReports({ showRefresh: false });
        Alert.alert('Payment confirmation pending', paymentConfirmation.message);
        return;
      }

      setReceipt(intent);
      await clearPaymentAttempt(user.id, reportId, attempt.clientRequestId);
      attemptRef.current = null;
      clearPendingReportFunding(reportId).catch((error) => {
        console.log('Pending report funding cleanup error:', error);
      });
      await refreshReports({ showRefresh: false });
    } catch (error) {
      if (attemptRef.current?.phase === 'submitted') setConfirmationPending(true);
      if (!mounted.current) return;
      Alert.alert('Check contribution status', userMessage(error, 'We couldn’t update your contribution. View payment history before paying again.'));
    } finally {
      payLock.current = false;
      setPaying(false);
    }
  };

  if (loading || !recoveryReady) {
    return (
      <View style={[styles.container, { padding: 20, paddingTop: 28 }]}>
        <Text style={styles.title}>Cleanup fund</Text>
        <Text style={styles.reportTitle}>Review the report and your contribution before continuing.</Text>
        <View style={{ height: 104, marginTop: 24, borderRadius: 14, backgroundColor: '#F0F6F0' }} accessibilityLabel="Checking contribution availability" accessibilityRole="progressbar" />
      </View>
    );
  }

  if (loadError && !report) {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={44} color="#8A6400" />
        <Text style={styles.centerTitle}>This is taking longer than expected</Text>
        <Text style={styles.centerText}>{loadError}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          disabled={refreshing}
          onPress={() => {
            setReloadKey((value) => value + 1);
          }}
        >
          <SteadyButtonContent label="Try again" busy={refreshing} busyLabel="Refreshing contribution availability" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Return to report</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!flags?.payments_enabled || !flags?.gemini_financial_review_enabled) {
    return (
      <View style={styles.center}>
        <Ionicons name="construct-outline" size={42} color="#6C757D" />
        <Text style={styles.centerTitle}>Cleanup funds are not open yet</Text>
        <Text style={styles.centerText}>This feature is safely disabled while launch setup is completed.</Text>
      </View>
    );
  }

  if (receipt) {
    return (
      <View style={styles.center}>
        <View style={styles.successIcon}><Ionicons name="checkmark" size={38} color="#FFFFFF" /></View>
        <Text style={styles.centerTitle}>Contribution received</Text>
        <Text style={styles.centerText}>
          {formatUsd(receipt.principalAmountCents)} was added to the cleanup fund. Your total charge was {formatUsd(receipt.totalAmountCents)}.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Return to report</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (confirmationPending || recoveryError) return <View style={styles.center}>
    <Ionicons name="time-outline" size={44} color="#2F7D32" />
    <Text style={styles.centerTitle}>{confirmationPending ? 'Checking your payment' : 'Payment status'}</Text>
    <Text style={styles.centerText}>{recoveryError || 'Your payment attempt is saved. We’re waiting for confirmation. You can leave this screen and return without starting another charge.'}</Text>
    <TouchableOpacity style={styles.primaryButton} onPress={() => reconcileAttempt().catch(() => setRecoveryError('Status is still unavailable. Check your connection and retry.'))}><Text style={styles.primaryButtonText}>Refresh status</Text></TouchableOpacity>
    <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('ContributionHistory')}><Text style={styles.secondaryButtonText}>Payment activity</Text></TouchableOpacity>
    <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}><Text style={styles.secondaryButtonText}>Return to report</Text></TouchableOpacity>
  </View>;

  const unavailable = fundingAvailabilityPresentation(report);
  if (unavailable) {
    const needsPhotos = report?.funding_eligibility === 'better_photos';
    const canEditPhotos = needsPhotos && canEditOrDeleteReport(report, user) && !report?.funding_locked_at;
    return <FundingAvailabilityNotice
      title={unavailable.title}
      message={unavailable.message}
      needsPhotos={needsPhotos}
      canEditPhotos={canEditPhotos}
      pending={shouldRefreshFundingEligibility(report)}
      reportTitle={report?.title}
      savedAmount={fromReportCreation && principalCents ? formatUsd(principalCents) : null}
      refreshing={refreshing}
      refreshError={loadError}
      bottomInset={insets.bottom}
      onEditPhotos={() => navigation.popTo('App', { screen: 'Map', params: { reportId, editPhotos: true } })}
      onRefresh={() => { if (!refreshing) setReloadKey(value => value + 1); }}
      onReturn={() => navigation.goBack()}
    />;
  }

  return (
    <KeyboardAvoidingView style={styles.container} keyboardVerticalOffset={headerHeight} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{fromReportCreation ? 'Start your cleanup fund' : 'Help fund this cleanup'}</Text>
        <Text style={styles.reportTitle}>{report?.title || 'Litter report'}</Text>

        <View style={styles.rewardCard}>
          <View style={styles.rewardSummary}>
            <Text style={styles.rewardLabel}>Current cleanup reward</Text>
            <Text style={styles.rewardValue}>{formatUsd(report?.funded_amount_cents)}</Text>
          </View>
          <Text style={styles.rewardText}>Your contribution adds to this reward.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Contribution amount</Text>
          <View style={styles.amountPresets}>
            {['5', '25', '50'].map((preset) => {
              const selected = principalCents === Number(preset) * 100;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[styles.amountPreset, selected && styles.amountPresetSelected]}
                  onPress={() => setAmount(preset)}
                  disabled={paying || confirmationPending}
                  accessibilityRole="button"
                  accessibilityLabel={`Contribute $${preset}`}
                  accessibilityState={{ selected, disabled: paying || confirmationPending }}
                >
                  <Text style={[styles.amountPresetText, selected && styles.amountPresetTextSelected]}>${preset}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="25.00"
              style={styles.amountInput}
              editable={!paying && !confirmationPending}
              accessibilityLabel="Cleanup fund contribution amount"
            />
          </View>
          <Text style={[styles.helper, amount.trim() && !principalCents ? styles.error : null]}>Minimum $1 · Maximum $1,000 per contribution</Text>
        </View>

        {principalCents ? (
          <View style={styles.card}>
            <View style={styles.line}><Text style={styles.lineLabel}>Cleanup fund</Text><Text style={styles.lineValue}>{formatUsd(principalCents)}</Text></View>
            <View style={styles.line}><FeeExplanationLabel textStyle={styles.lineLabel} /><Text style={styles.lineValue}>{formatUsd(feeCents)}</Text></View>
          </View>
        ) : null}

        <View style={styles.termsCard}>
          <Ionicons name="information-circle-outline" size={21} color="#52636B" />
          <Text style={styles.termsText}>
            Stripe charges your selected payment method when you confirm so the cleanup reward is funded and available for a cleaner. Litterbugs pays the cleaner only after an approved cleanup. If the report closes or the funds reach the published holding limit, Litterbugs refunds your full charge, including the 10% fee. Funding freezes once a cleaner claims the report.
          </Text>
        </View>

        {confirmationPending ? (
          <View style={styles.pendingCard}>
            <Ionicons name="time-outline" size={21} color="#7A5810" />
            <Text style={styles.pendingText}>Your payment is being confirmed. You can return to the report while we check. Please don’t pay again.</Text>
          </View>
        ) : null}

      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#DDE2DE' }}>
        <View style={styles.line}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{principalCents ? formatUsd(principalCents + feeCents) : 'Enter an amount'}</Text></View>
        <TouchableOpacity
          style={[styles.primaryButton, styles.paymentButton, (!principalCents || confirmationPending) && styles.disabled]}
          activeOpacity={1}
          onPress={pay}
          disabled={!principalCents || paying || confirmationPending}
          accessibilityRole="button"
          accessibilityState={{ busy: paying, disabled: !principalCents || paying || confirmationPending }}
          accessibilityLabel={paying ? 'Opening secure payment' : confirmationPending ? 'Payment confirmation pending' : 'Continue to payment'}
        >
          <Text style={styles.primaryButtonText}>{confirmationPending ? 'Payment confirmation pending' : 'Continue to payment'}</Text>
          {paying && showPaymentSpinner ? (
            <View style={styles.paymentSpinner} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.paymentTrustRow}>
          <Ionicons name="lock-closed-outline" size={12} color="#687178" />
          <Text style={styles.paymentTrustText}>Secure checkout by Stripe</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F5F6F7' },
  centerTitle: { marginTop: 16, color: '#202428', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  centerText: { maxWidth: 360, marginTop: 9, color: '#667078', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2F7D32' },
  createdLabel: { marginTop: 16, color: '#2F7D32', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  savedContributionCard: { maxWidth: 380, marginTop: 20, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: 16, backgroundColor: '#E6F2E7' },
  savedContributionText: { flex: 1, color: '#3F6843', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  eyebrow: { color: '#2F7D32', fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#202428', fontSize: 26, lineHeight: 32, fontWeight: '700' },
  reportTitle: { marginTop: 8, color: '#687178', fontSize: 14, lineHeight: 20, fontWeight: '400' },
  rewardCard: { marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: '#F0F6F0' },
  rewardSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rewardLabel: { flexShrink: 1, color: '#3F6843', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  rewardValue: { color: '#245F2A', fontSize: 25, lineHeight: 31, fontWeight: '700' },
  rewardText: { marginTop: 6, color: '#526C55', fontSize: 12, lineHeight: 18 },
  card: { marginTop: 24, padding: 0, backgroundColor: '#FFFFFF' },
  label: { color: '#30363B', fontSize: 15, fontWeight: '600' },
  amountPresets: { flexDirection: 'row', gap: 10, marginTop: 12 },
  amountPreset: { flex: 1, minHeight: 48, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#DCE3DE', alignItems: 'center', justifyContent: 'center' },
  amountPresetSelected: { backgroundColor: '#EAF3EA', borderColor: '#2F7D32' },
  amountPresetText: { color: '#3E4842', fontSize: 16, fontWeight: '600' },
  amountPresetTextSelected: { color: '#2F7D32' },
  amountRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#B8C2B9', borderRadius: 13, backgroundColor: '#FBFCFB' },
  dollar: { paddingLeft: 15, color: '#30363B', fontSize: 24, fontWeight: '600' },
  amountInput: { flex: 1, minHeight: 56, paddingHorizontal: 8, color: '#202428', fontSize: 24, fontWeight: '600' },
  helper: { marginTop: 8, color: '#737D83', fontSize: 13 },
  error: { color: '#A33A32' },
  line: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineLabel: { color: '#59636A', fontSize: 15 },
  lineValue: { color: '#30363B', fontSize: 15, fontWeight: '700' },
  totalLine: { marginTop: 8, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#CDD3CF' },
  totalLabel: { color: '#202428', fontSize: 17, fontWeight: '600' },
  totalValue: { color: '#202428', fontSize: 18, fontWeight: '700' },
  termsCard: { marginTop: 20, paddingTop: 16, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#E8ECE9' },
  termsText: { flex: 1, color: '#52636B', fontSize: 13, lineHeight: 19 },
  pendingCard: { marginTop: 16, padding: 15, flexDirection: 'row', gap: 10, borderRadius: 14, backgroundColor: '#FFF4D6' },
  pendingText: { flex: 1, color: '#7A5810', fontSize: 13, lineHeight: 19 },
  primaryButton: { minWidth: 220, minHeight: 54, marginTop: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#2F7D32' },
  paymentTrustRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 9 },
  paymentTrustText: { color: '#687178', fontSize: 12, lineHeight: 17 },
  paymentButton: { marginTop: 8, paddingHorizontal: 36, paddingVertical: 12 },
  paymentSpinner: { position: 'absolute', right: 10, top: 0, bottom: 0, width: 20, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { minHeight: 48, marginTop: 10, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#2F7D32', fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
