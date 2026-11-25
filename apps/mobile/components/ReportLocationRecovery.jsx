import { useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../lib/theme';
import SlideUp from './SlideUp';

export function locationRecoveryCopy(reason) {
  if (reason === 'location_denied') return { title: 'Allow location to confirm your spot.', text: 'Your chosen pin is kept. Allow location access in Settings, then come back and try again.', settings: true };
  if (reason === 'location_out_of_range') return { title: 'Choose a nearby report location.', text: 'Reports must be within 50 miles of your current location. Your answers are kept; move the pin closer or try again when you’re nearby.', settings: false };
  return { title: 'We couldn’t check your location.', text: 'Your chosen pin and answers are kept. Move somewhere with a clearer GPS signal, then try again.', settings: true };
}

// Reused inside the report form's existing native Modal. Opening a second
// native Modal above that form is unreliable on iOS and risks losing context.
export function ReportLocationRecoveryContent({ reason, onRetry, onDismiss, inForm = false }) {
  const copy = locationRecoveryCopy(reason);
  const [settingsError, setSettingsError] = useState('');
  const openSettings = async () => {
    try { await Linking.openSettings(); }
    catch { setSettingsError('Open your phone’s Settings, choose Litterbugs, and allow location access. Then return and try again.'); }
  };
  const settingsButton = copy.settings ? <TouchableOpacity accessibilityRole="button" style={[styles.button, reason === 'location_denied' ? styles.primary : styles.secondary]} onPress={openSettings}><Text style={[styles.buttonText, reason === 'location_denied' && styles.primaryText]}>Open location settings</Text></TouchableOpacity> : null;
  return <View accessibilityViewIsModal style={styles.content}>
    <View style={styles.grabber} />
    <View style={styles.icon}><Ionicons name="locate-outline" size={26} color={colors.primary} /></View>
    <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
    <Text style={styles.body}>{copy.text}</Text>
    <View style={styles.kept}><Ionicons name="location-outline" size={17} color={colors.ink} /><Text style={styles.keptText}>Your report pin is kept</Text></View>
    {reason === 'location_denied' ? settingsButton : null}
    <TouchableOpacity accessibilityRole="button" style={[styles.button, reason === 'location_denied' ? styles.secondary : styles.primary]} onPress={onRetry}><Text style={[styles.buttonText, reason !== 'location_denied' && styles.primaryText]}>Try again</Text></TouchableOpacity>
    {reason !== 'location_denied' ? settingsButton : null}
    <TouchableOpacity accessibilityRole="button" style={styles.dismiss} onPress={onDismiss}><Text style={styles.dismissText}>{inForm ? 'Back to report' : 'Keep choosing a spot'}</Text></TouchableOpacity>
    {settingsError ? <Text accessibilityRole="alert" style={styles.body}>{settingsError}</Text> : null}
  </View>;
}

export default function ReportLocationRecovery({ reason, onRetry, onDismiss }) {
  const insets = useSafeAreaInsets();
  return <Modal visible={Boolean(reason)} transparent animationType="fade" onRequestClose={onDismiss}>
    <View style={[styles.backdrop, { paddingTop: insets.top + 20 }]}>
      <SlideUp style={styles.sheet} open={Boolean(reason)}>
        <ScrollView contentContainerStyle={{ paddingBottom: Math.max(16, insets.bottom) }}>
          <ReportLocationRecoveryContent reason={reason} onRetry={onRetry} onDismiss={onDismiss} />
        </ScrollView>
      </SlideUp>
    </View>
  </Modal>;
}

export const locationRecoveryStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: 'rgba(20,17,35,0.28)', zIndex: 20 },
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,17,35,0.28)' },
  sheet: { maxHeight: '100%', backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 10, backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  grabber: { width: 38, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 16 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 30, color: colors.ink, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted },
  kept: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 18 },
  keptText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  button: { minHeight: 48, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.white, borderColor: colors.lineStrong },
  buttonText: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  primaryText: { color: colors.white },
  dismiss: { minHeight: 46, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  dismissText: { color: colors.primary, fontSize: 15, fontWeight: '800', textAlign: 'center' },
});
