import { useEffect, useMemo, useState } from 'react';
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
import { initStripe, initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createCleanupContribution,
  formatUsd,
  loadCleanupFeatureFlags,
} from './lib/funding';
import { calculatePlatformFee, parseContributionAmount } from './lib/fundingMath';
import { useReports } from './lib/reports';

export default function FundingContributionScreen({ navigation, route }) {
  const reportId = route?.params?.reportId;
  const { getReportById, refreshReports } = useReports();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState(null);
  const [flags, setFlags] = useState(null);
  const [amount, setAmount] = useState('25');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const principalCents = useMemo(() => parseContributionAmount(amount), [amount]);
  const feeCents = principalCents == null ? null : calculatePlatformFee(principalCents);

  useEffect(() => {
    let active = true;
    Promise.all([getReportById(reportId), loadCleanupFeatureFlags()])
      .then(([nextReport, nextFlags]) => {
        if (!active) return;
        setReport(nextReport);
        setFlags(nextFlags);
      })
      .catch(() => {
        if (active) Alert.alert('Funding unavailable', 'This report could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [getReportById, reportId]);

  const pay = async () => {
    if (!principalCents || paying) return;
    try {
      setPaying(true);
      const intent = await createCleanupContribution({
        reportId,
        principalAmountCents: principalCents,
        clientRequestId: Crypto.randomUUID(),
      });
      await initStripe({
        publishableKey: intent.publishableKey,
        merchantIdentifier: Constants.expoConfig?.extra?.stripeAppleMerchantIdentifier
          || 'merchant.com.litterbugs.app',
        urlScheme: 'litterbugs',
      });
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Litterbugs',
        paymentIntentClientSecret: intent.paymentIntentClientSecret,
        returnURL: 'litterbugs://stripe-redirect',
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
        allowsDelayedPaymentMethods: false,
      });
      if (initError) throw new Error(initError.message);
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code === 'Canceled') return;
        throw new Error(paymentError.message);
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#2F7D32" /></View>;
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>CLEANUP FUND</Text>
        <Text style={styles.title}>Help fund this cleanup</Text>
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

        <TouchableOpacity style={[styles.primaryButton, (!principalCents || paying) && styles.disabled]} onPress={pay} disabled={!principalCents || paying}>
          {paying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Continue to secure payment</Text>}
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
  primaryButton: { minWidth: 220, minHeight: 54, marginTop: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#2F7D32' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
