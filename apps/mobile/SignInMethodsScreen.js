import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from './lib/supabase';
import { connectSignInMethod } from './lib/auth';
import { identityLinkErrorMessage } from './lib/identityLinking';
import { openSupport } from './lib/support';
import AppleSignInButton from './components/AppleSignInButton';
import LoadingBee from './components/LoadingBee';
import { ErrorText, TextLink } from './components/ui';
import { colors } from './lib/theme';

export default function SignInMethodsScreen() {
  const [identities, setIdentities] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const load = async () => {
    setError('');
    const { data, error: failure } = await supabase.auth.getUserIdentities();
    if (failure) { setError('We couldn’t load your sign-in methods. Please try again.'); return; }
    setIdentities(data.identities);
  };
  useEffect(() => { load().catch(() => setError('Check your connection and try again.')); }, []);
  const connect = async (provider) => {
    if (busy) return;
    setBusy(provider);
    try {
      const result = await connectSignInMethod(provider);
      if (result.cancelled) return;
      setIdentities(result.identities);
      Alert.alert('Sign-in connected', 'You can now use this sign-in to access the same Litterbugs account.');
    } catch (failure) {
      if (failure?.code === 'ERR_REQUEST_CANCELED' || /cancelled|canceled|access_denied/i.test(failure?.message || '')) return;
      Alert.alert('Couldn’t connect sign-in', identityLinkErrorMessage(failure));
    } finally { setBusy(null); }
  };
  const has = (provider) => identities?.some((identity) => identity.provider === provider);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.intro}>Connect another sign-in to keep using the same profile, reports, and rewards.</Text>
    <View style={styles.methods}>
    {error ? <View><ErrorText style={styles.error}>{error}</ErrorText><TextLink align="start" label="Try again" onPress={() => load().catch(() => setError('Check your connection and try again.'))} /></View> : identities === null ? <LoadingBee label="Loading sign-in methods" size={48} /> : <>
      {['email', 'google', 'facebook', 'apple'].filter(has).map((provider) => <View key={provider} style={styles.row}><Text style={styles.label}>{provider === 'email' ? 'Email' : provider[0].toUpperCase() + provider.slice(1)}</Text><Text style={styles.connected}>Connected</Text></View>)}
      {['google', 'facebook'].filter((provider) => !has(provider)).map((provider) => <TouchableOpacity key={provider} accessibilityRole="button" accessibilityState={{ disabled: Boolean(busy), busy: busy === provider }} disabled={Boolean(busy)} style={styles.row} onPress={() => connect(provider)}><Text style={styles.connectLabel}>Connect {provider === 'google' ? 'Google' : 'Facebook'}</Text>{busy === provider && <ActivityIndicator color={colors.primary} />}</TouchableOpacity>)}
      {!has('apple') && <View style={styles.apple}><AppleSignInButton onPress={() => connect('apple')} disabled={Boolean(busy)} loading={busy === 'apple'} /></View>}
    </>}
    </View>
    <Text style={styles.description}>Already have two Litterbugs accounts? Connecting a sign-in won’t combine their histories.</Text>
    <TextLink align="start" label="Get help with your accounts" onPress={openSupport} />
  </ScrollView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white }, content: { padding: 20, paddingBottom: 40 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 22, marginBottom: 8 },
  error: { marginVertical: 16 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22, marginVertical: 16 },
  methods: { minHeight: 260 },
  row: { minHeight: 60, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  label: { fontSize: 16, color: colors.ink, flexShrink: 1 }, connectLabel: { fontSize: 16, color: colors.ink, fontWeight: '600', flexShrink: 1 }, connected: { color: colors.primary, fontSize: 14, fontWeight: '600' }, apple: { marginTop: 16 },
});
