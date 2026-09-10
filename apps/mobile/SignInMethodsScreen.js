import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from './lib/supabase';
import { connectSignInMethod } from './lib/auth';
import { identityLinkErrorMessage } from './lib/identityLinking';
import { openSupport } from './lib/support';
import AppleSignInButton from './components/AppleSignInButton';

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
    <Text style={styles.title}>Your ways to sign in</Text>
    <Text style={styles.description}>Connect another sign-in to keep using the same profile, reports, and rewards.</Text>
    <View style={styles.methods}>
    {error ? <View><Text accessibilityRole="alert" style={styles.description}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => load().catch(() => setError('Check your connection and try again.'))} style={styles.row}><Text>Try again</Text></TouchableOpacity></View> : identities === null ? <ActivityIndicator accessibilityLabel="Loading sign-in methods" /> : <>
      {['email', 'google', 'facebook', 'apple'].filter(has).map((provider) => <View key={provider} style={styles.row}><Text style={styles.label}>{provider === 'email' ? 'Email' : provider[0].toUpperCase() + provider.slice(1)}</Text><Text style={styles.connected}>Connected</Text></View>)}
      {['google', 'facebook'].filter((provider) => !has(provider)).map((provider) => <TouchableOpacity key={provider} accessibilityRole="button" accessibilityState={{ disabled: Boolean(busy), busy: busy === provider }} disabled={Boolean(busy)} style={styles.row} onPress={() => connect(provider)}><Text style={styles.label}>Connect {provider === 'google' ? 'Google' : 'Facebook'}</Text>{busy === provider && <ActivityIndicator />}</TouchableOpacity>)}
      {!has('apple') && <View style={styles.apple}><AppleSignInButton onPress={() => connect('apple')} disabled={Boolean(busy)} loading={busy === 'apple'} /></View>}
    </>}
    </View>
    <Text style={styles.description}>Already have two Litterbugs accounts? Connecting a sign-in won’t combine their histories.</Text>
    <TouchableOpacity accessibilityRole="button" onPress={openSupport} style={styles.row}><Text style={styles.connected}>Get help with your accounts</Text></TouchableOpacity>
  </ScrollView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, content: { padding: 20, paddingBottom: 40 },
  title: { color: '#26342A', fontSize: 24, lineHeight: 31, fontWeight: '600' },
  description: { color: '#67746B', fontSize: 14, lineHeight: 22, marginVertical: 16 },
  methods: { minHeight: 260 },
  row: { minHeight: 60, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E2EAE3' },
  label: { fontSize: 16, color: '#303B34', flexShrink: 1 }, connected: { color: '#2F7D32', fontSize: 14, fontWeight: '600' }, apple: { marginTop: 16 },
});
