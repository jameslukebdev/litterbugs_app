import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export default function NavigationRow({ label, icon, onPress, destructive = false, busy = false }) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, busy && styles.disabled]}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionCopy}>
        <Ionicons name={icon} size={21} color={destructive ? '#C62828' : '#4E5A61'} />
        <Text
          style={[styles.actionText, destructive && styles.destructiveText]}
        >
          {label}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={destructive ? '#C62828' : '#4E5A61'} />
      ) : (
        <Ionicons name="chevron-forward" size={21} color={destructive ? '#C62828' : '#9AA1A8'} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  actionRow: { minHeight: 60, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E3E5', backgroundColor: '#FFFFFF' },
  actionCopy: { flex: 1, minWidth: 0, marginRight: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionText: { flex: 1, paddingVertical: 12, color: '#30363B', fontSize: 16 },
  destructiveText: { color: '#C62828' },
  disabled: { opacity: 0.6 },
});
