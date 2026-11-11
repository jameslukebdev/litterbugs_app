import { userMessage } from './lib/userMessage';
import FeeExplanationLabel from './components/FeeExplanationLabel';
import { useHeaderHeight } from '@react-navigation/elements';
import { reconcileContribution } from './lib/reconcileContribution';
import { replaceUnpaidContribution } from './lib/replaceUnpaidContribution';
import { useSession } from './lib/session';
import { supabase } from './lib/supabase';
import { loadPaymentAttempt, savePaymentAttempt, clearPaymentAttempt } from './lib/contributionRecovery';
import { useEffect, useRef, useState } from 'react';
import { trackParticipation, trackParticipationFailure } from './lib/analytics';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  loadContributionQuote,
  formatUsd,
  loadCleanupFeatureFlags,
} from './lib/funding';
import { parseContributionAmount } from './lib/fundingMath';
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
import { ErrorText, PrimaryButton, TextLink } from './components/ui';
import { hapticSuccess } from './lib/haptics';
import { canEditOrDeleteReport } from './lib/reportAccess';
import { useIsFocused } from '@react-navigation/native';
import { colors, fonts } from './lib/theme';

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
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteRetry, setQuoteRetry] = useState(0);
  const currentQuote = quote?.principalAmountCents === principalCents ? quote : null;
  const feeCents = currentQuote?.platformFeeCents ?? null;
  useEffect(() => {
    if (!principalCents || !isFocused) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      loadContributionQuote(principalCents).then(value => { if (!cancelled) { setQuote(value); setQuoteError(''); } }).catch(error => { if (!cancelled) { setQuote(null); setQuoteError(error.message); } });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [principalCents, isFocused, quoteRetry]);

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
      hapticSuccess();
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

  useEffect(() => { trackParticipation('fund', 'amount_review'); }, []);

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
      const intent = attempt.intent || await createCleanupContribution({ reportId, principalAmountCents: attempt.principalAmountCents, clientRequestId: attempt.clientRequestId, pricingVersion: currentQuote?.pricingVersion });
      attempt = { ...attempt, intent, phase: 'ready' };
      await savePaymentAttempt(user.id, reportId, attempt, { updating: true });
      attemptRef.current = attempt;
      if (!mounted.current) return;
      const accepted = await new Promise((resolve) => Alert.alert(
        'Confirm contribution',
        `Cleanup contribution: ${formatUsd(intent.principalAmountCents)}\nService fee: ${formatUsd(intent.platformFeeCents)}\nTotal payment: ${formatUsd(intent.totalAmountCents)}`,
        [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue to payment', onPress: () => resolve(true) }],
        { cancelable: true, onDismiss: () => resolve(false) },
      ));
      if (!accepted || !mounted.current) return;
      trackParticipation('fund', 'payment_form');
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
      trackParticipation('fund', 'payment_submitted');
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code !== 'Canceled') trackParticipationFailure('fund', 'payment_submitted', 'payment_rejected');
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
        trackParticipationFailure('fund', 'payment_submitted', 'payment_confirmation_unavailable');
        setConfirmationPending(true);
        await refreshReports({ showRefresh: false });
        Alert.alert('Payment confirmation pending', paymentConfirmation.message);
        return;
      }

      trackParticipation('fund', 'payment_confirmed');
      hapticSuccess();
      setReceipt(intent);
      await clearPaymentAttempt(user.id, reportId, attempt.clientRequestId);
      attemptRef.current = null;
      clearPendingReportFunding(reportId).catch((error) => {
        console.log('Pending report funding cleanup error:', error);
      });
      await refreshReports({ showRefresh: false });
    } catch (error) {
      setQuote(null);
      setQuoteRetry(value => value + 1);
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
        <View style={{ height: 104, marginTop: 24, borderRadius: 14, backgroundColor: colors.primarySoft }} accessibilityLabel="Checking contribution availability" accessibilityRole="progressbar" />
      </View>
    );
  }

  if (loadError && !report) {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={44} color={colors.yellow} />
        <Text style={styles.centerTitle}>This is taking longer than expected</Text>
        <Text style={styles.centerText}>{loadError}</Text>
        <PrimaryButton label="Try again" busy={refreshing} busyLabel="Refreshing contribution availability" onPress={() => setReloadKey((value) => value + 1)} style={styles.centerButton} />
        <TextLink label="Return to report" onPress={() => navigation.goBack()} style={styles.secondaryButton} />
      </View>
    );
  }

  if (!flags?.payments_enabled || !flags?.gemini_financial_review_enabled) {
    return (
      <View style={styles.center}>
        <Ionicons name="construct-outline" size={42} color={colors.muted} />
        <Text style={styles.centerTitle}>Cleanup funds are not open yet</Text>
        <Text style={styles.centerText}>This feature is safely disabled while launch setup is completed.</Text>
      </View>
    );
  }

  if (receipt) {
    return (
      <View style={styles.center}>
        {/* Website finish: the bee and "Thank you!". */}
        <Image source={require('./assets/bugs/bee.png')} style={{ width: 56, height: 56 }} resizeMode="contain" accessible={false} />
        <Text style={styles.centerTitle}>Thank you!</Text>
        <Text style={styles.centerText}>
          {formatUsd(receipt.principalAmountCents)} is in the cleanup fund. Someone can now earn cash for cleaning this spot. Your total charge was {formatUsd(receipt.totalAmountCents)}.
        </Text>
        <PrimaryButton label="Return to report" onPress={() => navigation.goBack()} style={styles.centerButton} />
      </View>
    );
  }

  if (confirmationPending || recoveryError) return <View style={styles.center}>
    <Ionicons name="time-outline" size={44} color={colors.primary} />
    <Text style={styles.centerTitle}>{confirmationPending ? 'Checking your payment' : 'Payment status'}</Text>
    <Text style={styles.centerText}>{recoveryError || 'Your payment attempt is saved. We’re waiting for confirmation. You can leave this screen and return without starting another charge.'}</Text>
    <PrimaryButton label="Refresh status" style={styles.centerButton} onPress={() => reconcileAttempt().catch(() => setRecoveryError('Status is still unavailable. Check your connection and retry.'))} />
    <TextLink label="Payment activity" onPress={() => navigation.navigate('ContributionHistory')} style={styles.secondaryButton} />
    <TextLink label="Return to report" onPress={() => navigation.goBack()} />
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
        {/* Website fund dialog: the bee labels the fund; colour lives in the yellow money controls. */}
        <View style={styles.titleRow}>
          <Image source={require('./assets/bugs/bee.png')} style={styles.titleBug} resizeMode="contain" accessible={false} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} accessibilityRole="header">{fromReportCreation ? 'Start the cleanup fund' : 'Add to the cleanup fund'}</Text>
            <Text style={styles.reportTitle}>{report?.title || 'Litter report'}</Text>
          </View>
        </View>
        <Text style={styles.rewardText}>
          Whoever cleans this spot earns this money once the cleanup is approved.
          {Number(report?.funded_amount_cents) > 0 ? ` The fund is ${formatUsd(report.funded_amount_cents)} so far.` : ''}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>How much?</Text>
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
          <Text style={styles.subLabel}>Or enter an amount</Text>
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
          <Text style={[styles.helper, amount.trim() && !principalCents ? styles.error : null]}>Minimum $1, maximum $1,000</Text>
        </View>

        {principalCents ? (
          <View style={styles.summaryCard}>
            <View style={styles.line}><Text style={styles.lineLabel}>Goes to the cleaner</Text><Text style={styles.lineValue}>{formatUsd(principalCents)}</Text></View>
            <View style={styles.line}><FeeExplanationLabel textStyle={styles.lineLabel} /><Text style={styles.lineValue}>{feeCents == null ? 'Checking…' : formatUsd(feeCents)}</Text></View>
            <View style={[styles.line, styles.totalLine]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{currentQuote ? formatUsd(currentQuote.totalAmountCents) : 'Checking…'}</Text></View>
          </View>
        ) : null}

        {quoteError ? <View style={styles.card}><ErrorText>{quoteError}</ErrorText><TextLink align="start" label="Retry pricing" onPress={() => setQuoteRetry(value => value + 1)} /></View> : null}
        <View style={styles.termsCard}>
          <Ionicons name="information-circle-outline" size={21} color={colors.body} />
          {/* Same refund line as the website's fund dialog. */}
          <Text style={styles.termsText}>
            If this report closes before payout, your full charge, including the fee, is refunded.
          </Text>
        </View>

        {confirmationPending ? (
          <View style={styles.pendingCard}>
            <Ionicons name="time-outline" size={21} color={colors.yellow} />
            <Text style={styles.pendingText}>Your payment is being confirmed. You can return to the report while we check. Please don’t pay again.</Text>
          </View>
        ) : null}

      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line }}>
        <TouchableOpacity
          style={[styles.primaryButton, styles.paymentButton, (!principalCents || confirmationPending) && styles.disabled]}
          activeOpacity={1}
          onPress={pay}
          disabled={!principalCents || !currentQuote || paying || confirmationPending}
          accessibilityRole="button"
          accessibilityState={{ busy: paying, disabled: !principalCents || !currentQuote || paying || confirmationPending }}
          accessibilityLabel={paying ? 'Opening secure payment' : confirmationPending ? 'Payment confirmation pending' : 'Continue to payment'}
        >
          <Text style={styles.primaryButtonText}>{confirmationPending ? 'Payment confirmation pending' : 'Continue to payment'}</Text>
          {paying && showPaymentSpinner ? (
            <View style={styles.paymentSpinner} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <ActivityIndicator size="small" color={colors.white} />
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.paymentTrustRow}>
          <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
          <Text style={styles.paymentTrustText}>Secure checkout by Stripe</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.white },
  centerTitle: { marginTop: 16, color: colors.ink, fontSize: 24, fontFamily: fonts.heading, textAlign: 'center' },
  centerText: { maxWidth: 360, marginTop: 9, color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  createdLabel: { marginTop: 16, color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  savedContributionCard: { maxWidth: 380, marginTop: 20, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: 16, backgroundColor: colors.primarySoft },
  savedContributionText: { flex: 1, color: colors.primaryDark, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 21, lineHeight: 25, fontFamily: fonts.heading },
  reportTitle: { marginTop: 2, color: colors.muted, fontSize: 14, lineHeight: 20 },
  rewardText: { marginTop: 14, color: colors.body, fontSize: 15, lineHeight: 22 },
  card: { marginTop: 22, padding: 0, backgroundColor: colors.white },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleBug: { width: 34, height: 34 },
  subLabel: { marginTop: 16, color: colors.ink, fontSize: 14, fontWeight: '800' },
  summaryCard: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18, borderWidth: 2, borderColor: colors.yellowBorder, backgroundColor: colors.yellowSoft },
  label: { color: colors.ink, fontSize: 17, fontFamily: fonts.heading },
  amountPresets: { flexDirection: 'row', gap: 10, marginTop: 12 },
  amountPreset: { flex: 1, minHeight: 54, padding: 6, borderRadius: 16, borderWidth: 2, borderColor: colors.yellowBorder, borderBottomWidth: 4, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  amountPresetSelected: { backgroundColor: colors.yellowSoft, borderColor: colors.fundEdge },
  amountPresetText: { color: colors.yellow, fontSize: 20, fontFamily: fonts.heading },
  amountPresetTextSelected: { color: colors.yellow },
  amountRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white },
  dollar: { paddingLeft: 14, color: colors.yellow, fontSize: 18, fontWeight: '800' },
  amountInput: { flex: 1, minHeight: 48, paddingHorizontal: 8, color: colors.ink, fontSize: 18, fontWeight: '700' },
  helper: { marginTop: 8, color: colors.muted, fontSize: 13 },
  error: { color: colors.red },
  line: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineLabel: { color: colors.body, fontSize: 15 },
  lineValue: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  totalLine: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.yellowBorder, borderStyle: 'dashed' },
  totalLabel: { color: colors.ink, fontSize: 18, fontFamily: fonts.heading },
  totalValue: { color: colors.ink, fontSize: 18, fontFamily: fonts.heading },
  termsCard: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  termsText: { flex: 1, color: colors.body, fontSize: 13, lineHeight: 19 },
  pendingCard: { marginTop: 16, flexDirection: 'row', gap: 10 },
  pendingText: { flex: 1, color: colors.yellow, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  primaryButton: { minWidth: 220, minHeight: 54, marginTop: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary },
  paymentTrustRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 9 },
  paymentTrustText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  paymentButton: { marginTop: 8, paddingHorizontal: 36, paddingVertical: 12 },
  paymentSpinner: { position: 'absolute', right: 10, top: 0, bottom: 0, width: 20, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  secondaryButton: { marginTop: 10 },
  centerButton: { minWidth: 220, marginTop: 22 },
  disabled: { opacity: 0.55 },
});
