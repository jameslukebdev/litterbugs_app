import { useEffect, useMemo, useState } from 'react';
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
import { fundingAvailabilityPresentation } from './lib/fundingAvailability';
import { useReports } from './lib/reports';
import { withTimeout } from './lib/asyncTimeout';
import BrandedLoadingState, { LoadingButtonContent } from './BrandedLoadingState';

export default function FundingContributionScreen({ navigation, route }) {
  const reportId = route?.params?.reportId;
  const fromReportCreation = route?.params?.fromReportCreation === true;
  const initialAmount = route?.params?.initialAmount;
  const { getReportById, refreshReports } = useReports();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState(null);
  const [flags, setFlags] = useState(null);
  const [amount, setAmount] = useState(
    typeof initialAmount === 'string' && initialAmount.trim() ? initialAmount : '25'
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const principalCents = useMemo(() => parseContributionAmount(amount), [amount]);
  const feeCents = principalCents == null ? null : calculatePlatformFee(principalCents);

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
      && ['safety_hold', null, undefined].includes(report?.funding_eligibility);
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

  const pay = async () => {
    if (!principalCents || paying) return;
    try {
      setPaying(true);
      const intent = await createCleanupContribution({
        reportId,
        principalAmountCents: principalCents,
        clientRequestId: Crypto.randomUUID(),
      });
      const applePayEnabled = Platform.OS === 'ios'
        && Constants.expoConfig?.extra?.stripeApplePayEnabled === true;
      await initStripe(stripeInitializationConfiguration({
        publishableKey: intent.publishableKey,
        urlScheme: 'litterbugs',
        applePayEnabled,
        merchantIdentifier: Constants.expoConfig?.extra?.stripeAppleMerchantIdentifier,
      }));
      const { error: initError } = await initPaymentSheet(paymentSheetConfiguration({
        paymentIntentClientSecret: intent.paymentIntentClientSecret,
        platform: Platform.OS,
        applePayEnabled,
        isDevelopment: __DEV__,
      }));
      if (initError) throw new Error(initError.message);
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code === 'Canceled') return;
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
      await refreshReports({ showRefresh: false });
    } catch (error) {
      Alert.alert('Contribution not completed', error.message || 'Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <BrandedLoadingState
        working
        title="Finishing your report…"
        message="Your report is saved. We’re checking whether it can accept contributions."
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

  const unavailable = fundingAvailabilityPresentation(report);
  if (unavailable) {
    const isNewReportFundingStep = fromReportCreation;
    const isPendingStartingContribution = fromReportCreation
      && ['safety_hold', null, undefined].includes(report?.funding_eligibility);
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="25.00"
              style={styles.amountInput}
              editable={!paying}
              accessibilityLabel="Cleanup fund contribution amount"
            />
          </View>
          <Text style={[styles.helper, !principalCents && styles.error]}>Minimum $5 · Maximum $5,000 per contribution</Text>
        </View>

        {principalCents ? (
          <View style={styles.card}>
            <View style={styles.line}><Text style={styles.lineLabel}>Cleanup fund</Text><Text style={styles.lineValue}>{formatUsd(principalCents)}</Text></View>
            <View style={styles.line}><Text style={styles.lineLabel}>Litterbugs fee (10%)</Text><Text style={styles.lineValue}>{formatUsd(feeCents)}</Text></View>
            <View style={[styles.line, styles.totalLine]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{formatUsd(principalCents + feeCents)}</Text></View>
          </View>
        ) : null}

        <View style={styles.termsCard}>
          <Ionicons name="information-circle-outline" size={21} color="#52636B" />
          <Text style={styles.termsText}>
            The first contribution locks the report’s original details. If the report closes or your funds reach Stripe’s holding limit before payout, Litterbugs refunds your full charge, including the 10% fee. Funding freezes once a cleaner claims the report.
          </Text>
        </View>

        {confirmationPending ? (
          <View style={styles.pendingCard}>
            <Ionicons name="time-outline" size={21} color="#7A5810" />
            <Text style={styles.pendingText}>Stripe is confirming your payment. Return to the report and refresh it shortly. Do not submit it again.</Text>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.primaryButton, (!principalCents || paying || confirmationPending) && styles.disabled]} onPress={pay} disabled={!principalCents || paying || confirmationPending}>
          {paying ? <LoadingButtonContent label="Opening secure payment…" /> : <Text style={styles.primaryButtonText}>{confirmationPending ? 'Payment confirmation pending' : 'Continue to secure payment'}</Text>}
        </TouchableOpacity>
      </ScrollView>
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
