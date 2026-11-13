import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

// Approval belongs to this submission, never to the analytics preference.
export default function PhotoReviewChoice({ accepted, onChange, disabled = false, avatar = false }) {
  return <View style={styles.container}>
    <Text style={styles.description}>Litterbugs sends uploaded photos to Cloudmersive for malware and inappropriate-content checks.{avatar ? '' : ' Report and cleanup photos may also go to Google Gemini to check clarity, litter, hazards and cleanup progress.'} Photos can contain personal information. Avoid faces, addresses and other private details. AI can make mistakes.</Text>
    <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="I agree to the Terms and allow these photo checks" accessibilityState={{ checked: accepted, disabled }} disabled={disabled} onPress={() => onChange(!accepted)} style={styles.choice}>
      <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={25} color={colors.primary} />
      <Text style={styles.label}>I agree to the Terms and allow these photo checks.</Text>
    </TouchableOpacity>
    <View style={styles.links}>
      <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL('https://litterbugs.app/terms')} style={styles.link}><Text style={styles.linkText}>Terms</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL('https://litterbugs.app/privacy')} style={styles.link}><Text style={styles.linkText}>Privacy policy</Text></TouchableOpacity>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { marginVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 16 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  label: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 20 },
  links: { flexDirection: 'row', gap: 20 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
