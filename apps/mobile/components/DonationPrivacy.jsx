import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

export function AnonymousDonationChoice({ shown, onChange, disabled = false, locked = false }) {
  return <View style={styles.choice}>
    <TouchableOpacity style={styles.checkRow} onPress={() => onChange(!shown)} disabled={disabled || locked}
      accessibilityRole="checkbox" accessibilityLabel="Donate anonymously"
      accessibilityState={{ checked: !shown, disabled: disabled || locked }}>
      <Ionicons name={shown ? 'square-outline' : 'checkbox'} size={24} color={colors.primary} />
      <Text style={styles.checkLabel}>Donate anonymously</Text>
    </TouchableOpacity>
    <Text style={styles.help}>{shown ? 'Your name will be shown.' : 'Your name will be hidden.'} You can change this later in Payment activity.</Text>
    {locked ? <Text style={styles.help}>This payment’s name choice is saved.</Text> : null}
  </View>;
}

export function PaymentNameVisibility({ shown, busy, error, onChange }) {
  return <View style={styles.panel}>
    <View style={styles.row}>
      <View style={styles.icon}><Ionicons name={shown ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} /></View>
      <View style={styles.copy}>
        <Text style={styles.title}>Donation privacy</Text>
        <Text style={styles.status} accessibilityLiveRegion="polite">{shown ? 'Your name is shown.' : 'You’re listed as Anonymous.'}</Text>
      </View>
    </View>
    <TouchableOpacity onPress={() => onChange(!shown)} disabled={busy} style={styles.button}
      accessibilityRole="button" accessibilityState={{ disabled: busy, busy }}>
      <Text style={styles.buttonText}>{busy ? 'Saving…' : shown ? 'Hide my name' : 'Show my name'}</Text>
    </TouchableOpacity>
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  choice: { marginVertical: 16, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  checkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '600' },
  help: { marginLeft: 34, color: colors.muted, fontSize: 13, lineHeight: 20 },
  panel: { marginVertical: 20, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 14, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  status: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  button: { minHeight: 44, padding: 10, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  error: { color: colors.red, fontSize: 14, lineHeight: 21 },
});
