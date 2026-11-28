import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { initPaymentSheet, initStripe, presentPaymentSheet, retrievePaymentIntent } from '@stripe/stripe-react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProfileAvatar from './ProfileAvatar';
import LoadingBee from './components/LoadingBee';
import { ErrorText, LoadFailure, PrimaryButton, SecondaryButton } from './components/ui';
import { loadTipRecipient, parseTipAmount, startTip, tipFeeCents, TIP_PRESETS } from './lib/community';
import { formatUsd } from './lib/funding';
import { hapticSelect, hapticSuccess } from './lib/haptics';
import { paymentSheetConfiguration, stripeInitializationConfiguration } from './lib/paymentConfiguration';
import { evaluatePaymentConfirmation } from './lib/paymentConfirmation';
import { getRankAsset } from './lib/rankAssets';
import { getRankForPoints } from './lib/ranking';
import { useSession } from './lib/session';
import { colors, fonts } from './lib/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * A tip for a cleaner or reporter. The whole tip goes to them through Stripe; the
 * Litterbugs service fee is added on top. Same backend and amounts as the website's tip page.
 */
export default function TipScreen({ navigation, route }) {
  const { profileId, role = 'cleaner', reportId = null } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { user, isPermanentUser } = useSession();
  const [recipient, setRecipient] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [dollars, setDollars] = useState('5');
  const [from, setFrom] = useState('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(null);
  const requestId = useRef(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    loadTipRecipient(profileId)
      .then((data) => { if (active) { setRecipient(data); if (!data) setLoadFailed(true); } })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [profileId, attempt]);

  const name = recipient?.name || route.params?.name || 'them';
  const cents = parseTipAmount(dollars);
  const fee = cents == null ? null : tipFeeCents(cents);
  const total = cents == null ? null : cents + fee;
  const invalid = dollars.trim() !== '' && cents == null;
  const accountEmail = isPermanentUser ? user?.email : null;
  // A new amount, name or note is a new tip request.
  useEffect(() => { requestId.current = null; }, [cents, from, note]);

  async function pay() {
    if (busy || cents == null) return;
    const receiptEmail = accountEmail || email.trim();
    if (!EMAIL.test(receiptEmail)) { setMessage('Enter an email for your receipt.'); return; }
    setBusy(true);
    setMessage('');
    requestId.current ??= Crypto.randomUUID();
    try {
      const tip = await startTip({
        profileId, tipAmountCents: cents, clientRequestId: requestId.current, role,
        receiptEmail: accountEmail ? undefined : receiptEmail,
        tipperName: from.trim() || undefined, note: note.trim() || undefined, reportId: reportId || undefined,
      });
      if (!mounted.current) return;
      const applePayEnabled = Platform.OS === 'ios' && Constants.expoConfig?.extra?.stripeApplePayEnabled === true;
      await initStripe(stripeInitializationConfiguration({
        publishableKey: tip.publishableKey, urlScheme: 'litterbugs', applePayEnabled,
        merchantIdentifier: Constants.expoConfig?.extra?.stripeAppleMerchantIdentifier,
      }));
      const { error: initError } = await initPaymentSheet(paymentSheetConfiguration({
        paymentIntentClientSecret: tip.clientSecret, platform: Platform.OS, applePayEnabled, isDevelopment: __DEV__,
      }));
      if (initError) throw new Error(initError.message);
      if (!mounted.current) return;
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code === 'Canceled') return;
        throw new Error(paymentError.message || 'Your payment didn’t go through. Please try again.');
      }
      const confirmation = evaluatePaymentConfirmation(await retrievePaymentIntent(tip.clientSecret));
      if (!mounted.current) return;
      requestId.current = null;
      hapticSuccess();
      setDone({ cents: tip.tipAmountCents ?? cents, email: receiptEmail, pending: !confirmation.confirmed });
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : 'We couldn’t start your tip. No payment has been made. Please try again.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={[styles.done, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.doneHeart}><Ionicons name="heart" size={34} color={colors.needsCleanup} /></View>
        <Text style={styles.doneTitle}>Thanks for tipping {name}!</Text>
        <Text style={styles.doneText}>
          {name} gets {formatUsd(done.cents)}.{done.pending ? ' Stripe is still confirming your payment.' : ''} Your receipt is on its way to {done.email}.
        </Text>
        <PrimaryButton label="Done" onPress={() => navigation.goBack()} style={styles.doneButton} />
      </View>
    );
  }

  if (loadFailed) {
    return <View style={styles.center}><LoadFailure title="This tip page couldn’t load" onRetry={() => setAttempt((value) => value + 1)} /></View>;
  }
  if (!recipient) {
    return <View style={styles.center}><LoadingBee label="Loading" /></View>;
  }

  const rank = getRankForPoints(recipient.rank_points);
  const facts = [recipient.cleanups > 0 && plural(recipient.cleanups, 'cleanup'), recipient.reports > 0 && plural(recipient.reports, 'report')].filter(Boolean).join(' · ');

  return (
    <KeyboardAvoidingView style={styles.screen} keyboardVerticalOffset={headerHeight} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.person}>
          <ProfileAvatar profile={{ ...recipient, id: profileId, display_name: recipient.name }} size={64} />
          <View style={styles.personCopy}>
            <Text style={styles.personName} numberOfLines={1}>{recipient.name}</Text>
            <View style={styles.personRank}>
              <Image source={getRankAsset(rank)} style={styles.personRankBug} contentFit="contain" accessible={false} />
              <Text style={styles.personFacts} numberOfLines={1}>{facts || rank.name}</Text>
            </View>
          </View>
        </View>

        {!recipient.can_receive_tips ? (
          <View style={styles.card}>
            <Text style={styles.unavailable}>{recipient.name} can’t receive tips right now.</Text>
            <SecondaryButton label="Back" onPress={() => navigation.goBack()} />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.presets} accessibilityRole="radiogroup" accessibilityLabel="Tip amount">
                {TIP_PRESETS.map((amount) => {
                  const selected = cents === amount * 100;
                  return (
                    <TouchableOpacity key={amount} style={[styles.preset, selected && styles.presetSelected]}
                      onPress={() => { hapticSelect(); setDollars(String(amount)); setMessage(''); }}
                      accessibilityRole="radio" accessibilityState={{ selected }} testID={`tip-preset-${amount}`}>
                      <Text style={[styles.presetText, selected && styles.presetTextSelected]}>${amount}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.label}>Other amount</Text>
              <View style={[styles.amountField, invalid && styles.fieldInvalid]}>
                <Text style={styles.dollar}>$</Text>
                <TextInput value={dollars} onChangeText={(value) => { setDollars(value); setMessage(''); }} keyboardType="decimal-pad"
                  style={styles.amountInput} accessibilityLabel="Other amount" maxLength={7} testID="tip-amount" />
              </View>
              {invalid ? <ErrorText>Enter $3 to $1,000.</ErrorText> : null}

              <Text style={styles.label}>Your name</Text>
              <TextInput value={from} onChangeText={setFrom} maxLength={60} autoComplete="name" style={styles.field}
                placeholder={isPermanentUser ? 'Your leaderboard name' : 'Anonymous'} placeholderTextColor={colors.subtle} accessibilityLabel="Your name" />

              <Text style={styles.label}>Add a note</Text>
              <TextInput value={note} onChangeText={setNote} maxLength={280} multiline style={[styles.field, styles.noteField]}
                placeholder="Say something nice" placeholderTextColor={colors.subtle} accessibilityLabel="Add a note" textAlignVertical="top" />

              {!accountEmail ? (
                <>
                  <Text style={styles.label}>Email for your receipt</Text>
                  <TextInput value={email} onChangeText={(value) => { setEmail(value); setMessage(''); }} keyboardType="email-address"
                    autoCapitalize="none" autoComplete="email" autoCorrect={false} style={styles.field} accessibilityLabel="Email for your receipt" />
                </>
              ) : null}
            </View>

            <View style={styles.card} accessibilityLiveRegion="polite">
              <View style={styles.line}><Text style={styles.gets} numberOfLines={1}>{name} gets</Text><Text style={styles.getsValue}>{cents == null ? '—' : formatUsd(cents)}</Text></View>
              <View style={styles.line}><Text style={styles.lineLabel}>Litterbugs service fee</Text><Text style={styles.lineValue}>{fee == null ? '—' : formatUsd(fee)}</Text></View>
              <View style={[styles.line, styles.totalLine]}><Text style={styles.totalLabel}>You pay</Text><Text style={styles.totalValue}>{total == null ? '—' : formatUsd(total)}</Text></View>
            </View>

            {message ? <ErrorText style={styles.message}>{message}</ErrorText> : null}
            <PrimaryButton label={total == null ? 'Continue to pay' : `Pay ${formatUsd(total)}`} busy={busy} busyLabel="Starting…"
              disabled={total == null} onPress={pay} accessibilityLabel={total == null ? 'Continue to pay' : `Pay ${formatUsd(total)} to tip ${name}`} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist },
  content: { padding: 16, gap: 14 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, paddingVertical: 4 },
  personCopy: { flex: 1, minWidth: 0, gap: 4 },
  personName: { color: colors.ink, fontSize: 24, lineHeight: 30, fontFamily: fonts.heading },
  personRank: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personRankBug: { width: 22, height: 22 },
  personFacts: { flexShrink: 1, color: colors.muted, fontSize: 14 },
  card: {
    padding: 16, gap: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line,
    borderBottomWidth: 4, borderBottomColor: colors.edge, backgroundColor: colors.white,
  },
  unavailable: { color: colors.body, fontSize: 16, lineHeight: 23, marginBottom: 8 },
  presets: { flexDirection: 'row', gap: 10 },
  preset: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  presetSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  presetText: { color: colors.ink, fontSize: 20, fontFamily: fonts.heading },
  presetTextSelected: { color: colors.primaryDark },
  label: { marginTop: 8, color: colors.ink, fontSize: 14, fontWeight: '700' },
  amountField: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.soft },
  fieldInvalid: { borderColor: colors.redBorder },
  dollar: { color: colors.muted, fontSize: 18, fontWeight: '700', marginRight: 4 },
  amountInput: { flex: 1, color: colors.ink, fontSize: 18, fontWeight: '700', paddingVertical: 10 },
  field: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.soft, color: colors.ink, fontSize: 16 },
  noteField: { minHeight: 88 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  gets: { flexShrink: 1, color: colors.ink, fontSize: 16, fontWeight: '800' },
  getsValue: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  lineLabel: { color: colors.muted, fontSize: 15 },
  lineValue: { color: colors.muted, fontSize: 15 },
  totalLine: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  totalLabel: { color: colors.ink, fontSize: 17, fontFamily: fonts.heading },
  totalValue: { color: colors.ink, fontSize: 20, fontFamily: fonts.heading },
  message: { textAlign: 'center' },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 10, backgroundColor: colors.white },
  doneHeart: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F1', marginBottom: 6 },
  doneTitle: { color: colors.ink, fontSize: 24, lineHeight: 30, fontFamily: fonts.heading, textAlign: 'center' },
  doneText: { color: colors.body, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  doneButton: { alignSelf: 'stretch', marginTop: 16 },
});
