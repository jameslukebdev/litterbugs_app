import FeeExplanationLabel from './components/FeeExplanationLabel';
import { useHeaderHeight } from '@react-navigation/elements';
import { reconcileContribution } from './lib/reconcileContribution';
import { useSession } from './lib/session';
import { supabase } from './lib/supabase';
import { loadPaymentAttempt, savePaymentAttempt, clearPaymentAttempt } from './lib/contributionRecovery';
import { useEffect, useRef, useState } from 'react';
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
import BrandedLoadingState, { LoadingButtonContent } from './BrandedLoadingState';

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
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const previousFundingEligibility = useRef(null);
  const fundingEligibilityInitialized = useRef(false);
  const principalCents = attemptRef.current?.principalAmountCents ?? parseContributionAmount(amount);
  const feeCents = principalCents == null ? null : calculatePlatformFee(principalCents);

  const reconcileAttempt = () => {
    if (reconciliationRef.current) return reconciliationRef.current;
    const run = async () => {
    setRecoveryError(null);
    const attempt = await loadPaymentAttempt(user.id, reportId);
    if (!mounted.current) return 'obsolete';
    attemptRef.current = attempt;
    if (!attempt) return 'none';
    setAmount(String(attempt.principalAmountCents / 100));
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
        if (active) setAmount(savedAmount ?? '25');
      })
      .catch((error) => {
        console.log('Pending report funding load error:', error);
        if (active) setAmount('25');
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
    let active = true;
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
        if (active) setLoadError(error?.message || 'This report could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [getReportById, reloadKey, reportId]);

  useEffect(() => {
    const shouldRecheck = fromReportCreation
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
  }, [fromReportCreation, getReportById, loadError, loading, report?.funding_eligibility, reportId]);

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
      const previousState = await reconcileAttempt();
      if (!mounted.current || ['obsolete', 'received', 'refund', 'failed'].includes(previousState)) return;
      let attempt = attemptRef.current;
      if (attempt?.phase === 'submitted') return;
      if (!attempt) {
        attempt = { clientRequestId: Crypto.randomUUID(), principalAmountCents: principalCents, createdAt: Date.now(), phase: 'preparing' };
        await savePaymentAttempt(user.id, reportId, attempt);
        attemptRef.current = attempt;
      }
      if (!attempt.intent && Date.now() - attempt.createdAt > 23 * 60 * 60 * 1000) {
        throw new Error('This older attempt needs a status check before another payment. Open Payment activity or contact support.');
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
      Alert.alert('Check contribution status', error.message || 'Return here to check your payment before trying again.');
    } finally {
      payLock.current = false;
      setPaying(false);
    }
  };

  if (loading || !recoveryReady) {
    return (
      <BrandedLoadingState
        working
        title={fromReportCreation ? "Finishing your report…" : "Checking contribution…"}
        message="Checking the report and any previous payment attempt."
      />
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={44} color="#8A6400" />
        <Text style={styles.centerTitle}>This is taking longer than expected</Text>
        <Text style={styles.centerText}>{loadError}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setLoading(true);
            setReloadKey((value) => value + 1);
          }}
        >
          <Text style={styles.primaryButtonText}>Try again</Text>
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
    const isNewReportFundingStep = fromReportCreation;
    const isPendingStartingContribution = fromReportCreation
      && shouldRefreshFundingEligibility(report);
    return (
      <View style={styles.center}>
        <View style={isNewReportFundingStep ? styles.successIcon : null}>
          <Ionicons
            name={isNewReportFundingStep ? 'checkmark' : 'shield-checkmark-outline'}
            size={isNewReportFundingStep ? 38 : 44}
            color={isNewReportFundingStep ? '#FFFFFF' : '#2F7D32'}
          />
        </View>
        {isNewReportFundingStep ? (
          <Text style={styles.createdLabel}>REPORT CREATED</Text>
        ) : null}
        <Text style={styles.centerTitle}>{unavailable.title}</Text>
        <Text style={styles.centerText}>{unavailable.message}</Text>
        {isNewReportFundingStep && principalCents ? (
          <View style={styles.savedContributionCard}>
            <Ionicons name="card-outline" size={22} color="#2F7D32" />
            <Text style={styles.savedContributionText}>
              {isPendingStartingContribution
                ? `Your ${formatUsd(principalCents)} choice is saved on this screen, but you have not been charged. We’ll check again automatically and show Stripe’s secure payment screen after approval.`
                : `Your ${formatUsd(principalCents)} choice has not been charged. Resolve the issue above, then choose Add funds again to continue securely with Stripe.`}
            </Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setLoading(true);
            setReloadKey((value) => value + 1);
          }}
          accessibilityRole="button"
          accessibilityLabel="Check cleanup fund eligibility again"
        >
          <Text style={styles.primaryButtonText}>Check again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Return to report</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} keyboardVerticalOffset={headerHeight} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>CLEANUP FUND</Text>
        <Text style={styles.title}>{fromReportCreation ? 'Start your cleanup fund' : 'Help fund this cleanup'}</Text>
        <Text style={styles.reportTitle}>{report?.title || 'Litter report'}</Text>

        <View style={styles.rewardCard}>
          <Text style={styles.rewardLabel}>Cleaner currently receives</Text>
          <Text style={styles.rewardValue}>{formatUsd(report?.funded_amount_cents)}</Text>
          <Text style={styles.rewardText}>Your contribution adds directly to this reward.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Contribution amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              value={attemptRef.current ? String(attemptRef.current.principalAmountCents / 100) : amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="25.00"
              style={styles.amountInput}
              editable={!paying && !attemptRef.current}
              accessibilityLabel="Cleanup fund contribution amount"
            />
          </View>
          {attemptRef.current ? <Text style={styles.helper}>Continuing your saved payment attempt with the same amount.</Text> : null}
          <Text style={[styles.helper, !principalCents && styles.error]}>Minimum $1 · Maximum $1,000 per contribution</Text>
        </View>

        {principalCents ? (
          <View style={styles.card}>
            <View style={styles.line}><Text style={styles.lineLabel}>Cleanup fund</Text><Text style={styles.lineValue}>{formatUsd(principalCents)}</Text></View>
            <View style={styles.line}><FeeExplanationLabel textStyle={styles.lineLabel} /><Text style={styles.lineValue}>{formatUsd(feeCents)}</Text></View>
            <View style={[styles.line, styles.totalLine]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{formatUsd(principalCents + feeCents)}</Text></View>
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
            <Text style={styles.pendingText}>Stripe is confirming your payment. Return to the report and refresh it shortly. Do not submit it again.</Text>
          </View>
        ) : null}

      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#DDE2DE' }}>
        <View style={styles.line}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{principalCents ? formatUsd(principalCents + feeCents) : 'Enter an amount'}</Text></View>
        <TouchableOpacity style={[styles.primaryButton, { marginTop: 8 }, (!principalCents || paying || confirmationPending) && styles.disabled]} onPress={pay} disabled={!principalCents || paying || confirmationPending}>
          {paying ? <LoadingButtonContent label="Opening secure payment…" /> : <Text style={styles.primaryButtonText}>{confirmationPending ? 'Payment confirmation pending' : 'Continue to secure payment'}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F5F6F7' },
  centerTitle: { marginTop: 16, color: '#202428', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  centerText: { maxWidth: 360, marginTop: 9, color: '#667078', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2F7D32' },
  createdLabel: { marginTop: 16, color: '#2F7D32', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  savedContributionCard: { maxWidth: 380, marginTop: 20, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: 16, backgroundColor: '#E6F2E7' },
  savedContributionText: { flex: 1, color: '#3F6843', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  eyebrow: { color: '#2F7D32', fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  title: { marginTop: 7, color: '#202428', fontSize: 29, fontWeight: '900' },
  reportTitle: { marginTop: 7, color: '#687178', fontSize: 15, fontWeight: '700' },
  rewardCard: { marginTop: 22, padding: 20, borderRadius: 18, backgroundColor: '#E6F2E7' },
  rewardLabel: { color: '#3F6843', fontSize: 13, fontWeight: '800' },
  rewardValue: { marginTop: 4, color: '#245F2A', fontSize: 34, fontWeight: '900' },
  rewardText: { marginTop: 5, color: '#526C55', fontSize: 14 },
  card: { marginTop: 16, padding: 18, borderRadius: 17, backgroundColor: '#FFFFFF' },
  label: { color: '#30363B', fontSize: 15, fontWeight: '800' },
  amountRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#B8C2B9', borderRadius: 13, backgroundColor: '#FBFCFB' },
  dollar: { paddingLeft: 15, color: '#30363B', fontSize: 24, fontWeight: '800' },
  amountInput: { flex: 1, minHeight: 56, paddingHorizontal: 8, color: '#202428', fontSize: 24, fontWeight: '800' },
  helper: { marginTop: 8, color: '#737D83', fontSize: 13 },
  error: { color: '#A33A32' },
  line: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineLabel: { color: '#59636A', fontSize: 15 },
  lineValue: { color: '#30363B', fontSize: 15, fontWeight: '700' },
  totalLine: { marginTop: 8, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#CDD3CF' },
  totalLabel: { color: '#202428', fontSize: 17, fontWeight: '900' },
  totalValue: { color: '#202428', fontSize: 18, fontWeight: '900' },
  termsCard: { marginTop: 16, padding: 15, flexDirection: 'row', gap: 10, borderRadius: 14, backgroundColor: '#EAF0F2' },
  termsText: { flex: 1, color: '#52636B', fontSize: 13, lineHeight: 19 },
  pendingCard: { marginTop: 16, padding: 15, flexDirection: 'row', gap: 10, borderRadius: 14, backgroundColor: '#FFF4D6' },
  pendingText: { flex: 1, color: '#7A5810', fontSize: 13, lineHeight: 19 },
  primaryButton: { minWidth: 220, minHeight: 54, marginTop: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#2F7D32' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryButton: { minHeight: 48, marginTop: 10, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#2F7D32', fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
