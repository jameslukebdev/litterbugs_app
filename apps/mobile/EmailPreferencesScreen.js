import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingBee from './components/LoadingBee';
import { LoadFailure, PrimaryButton } from './components/ui';
import { useSession } from './lib/session';
import useFocusedResource from './lib/useFocusedResource';
import { loadWeeklyEmailPreference, saveWeeklyEmailPreference } from './lib/weeklyEmail';
import { colors, fonts } from './lib/theme';

export function WeeklyEmailControls({ preference, onSave, onEdit }) {
  const [checked, setChecked] = useState(preference.subscribed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try { await onSave(checked); }
    catch { setError('Your email preference was not saved. Please try again.'); }
    finally { setBusy(false); }
  }
  return <>
    <Text style={styles.email} selectable>{preference.email}</Text>
    <View style={styles.panel}>
      <View style={styles.row}>
        <View style={styles.copy}><Text style={styles.label}>Weekly Litterbugs emails</Text><Text style={styles.caption}>Cleanup opportunities, community stories, and ways to support cleanups.</Text></View>
        <Switch value={checked} onValueChange={value => { setChecked(value); setError(''); onEdit?.(); }} disabled={busy}
          accessibilityLabel="Weekly Litterbugs emails" accessibilityHint="About once a week. Unsubscribe anytime."
          trackColor={{ false: colors.lineStrong, true: '#b9e9dd' }} thumbColor={checked ? '#283c37' : colors.white} ios_backgroundColor={colors.lineStrong} />
      </View>
      <Text style={styles.frequency}>About once a week. Unsubscribe anytime.</Text>
    </View>
    <Text style={styles.note}>This choice only changes weekly emails. You’ll still receive essential account and payment emails.</Text>
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    <PrimaryButton label="Save preferences" busyLabel="Saving…" onPress={save} busy={busy} disabled={busy || checked === preference.subscribed} />
  </>;
}

export default function EmailPreferencesScreen() {
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const load = useCallback(() => loadWeeklyEmailPreference(user?.id), [user?.id]);
  const resource = useFocusedResource(load, { enabled: Boolean(user?.id && !user.is_anonymous) });
  const [notice, setNotice] = useState(null);
  async function save(next) {
    const saved = await saveWeeklyEmailPreference(user?.id, next);
    setNotice({ owner: user.id, subscribed: saved.subscribed });
    await resource.refresh();
  }
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}>
    <View style={styles.icon}><Ionicons name="mail-outline" size={26} color={colors.primary} /></View>
    <Text style={styles.heading}>Email preferences</Text>
    <Text style={styles.intro}>A little news from your cleanup community.</Text>
    {!user?.id || user.is_anonymous ? <Text style={styles.note}>Sign in to manage email preferences.</Text>
      : resource.error ? <LoadFailure title="Couldn’t load email preferences" onRetry={resource.refresh} />
      : resource.loading || !resource.data ? <LoadingBee label="Loading email preferences" style={{ marginTop: 40 }} />
      : <>
        <WeeklyEmailControls key={`${user.id}:${resource.updatedAt}`} preference={resource.data} onSave={save} onEdit={() => setNotice(null)} />
        {notice?.owner === user.id && notice.subscribed === resource.data.subscribed ? <View style={styles.success} accessibilityRole="alert"><Ionicons name="checkmark-outline" size={20} color="#283c37" /><Text style={styles.successText}>Preferences saved. Weekly emails are {notice.subscribed ? 'on' : 'off'}.</Text></View> : null}
      </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: 22 },
  icon: { width: 50, height: 50, borderRadius: 15, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heading: { color: colors.ink, fontFamily: fonts.heading, fontSize: 28, lineHeight: 35 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 10 },
  email: { color: colors.body, fontSize: 14, lineHeight: 21, marginTop: 22, marginBottom: 26 },
  panel: { borderColor: colors.line, borderWidth: 1, borderRadius: 17, padding: 17 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  copy: { flex: 1 },
  label: { color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  caption: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 8 },
  frequency: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 18, paddingTop: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  note: { color: colors.muted, fontSize: 13, lineHeight: 21, marginVertical: 22 },
  error: { color: colors.red, fontSize: 14, lineHeight: 22, marginBottom: 17 },
  success: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: '#e5f7f1', borderColor: '#8ed7c5', borderWidth: 1, borderRadius: 12, padding: 13, marginTop: 20 },
  successText: { color: '#283c37', flex: 1, fontSize: 13, lineHeight: 21 },
});
