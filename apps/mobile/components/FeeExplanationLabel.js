import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function FeeExplanationLabel({ label = 'Litterbugs fee (10%)', textStyle }) {
  const explain = () => Alert.alert(
    'What the Litterbugs fee supports',
    'The fee helps cover:\n\n• Keeping the app running and maintained\n• Payment processing and transaction costs\n• Developing and maintaining safety features\n\nThe fee is added to your cleanup contribution. Your contribution goes toward the cleanup reward.',
    [{ text: 'Got it' }]
  );

  return (
    <TouchableOpacity
      onPress={explain}
      accessibilityRole="button"
      accessibilityLabel={`${label}. About this fee`}
      accessibilityHint="Opens an explanation of what the fee supports"
      style={styles.label}
    >
      <Text style={[styles.text, textStyle]}>{label}</Text>
      <Ionicons name="help-circle-outline" size={18} color="#687178" accessible={false} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, flexShrink: 1, marginRight: 8 },
  text: { color: '#687178', fontSize: 14, flexShrink: 1 },
});
