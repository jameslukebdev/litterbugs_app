import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export default function NavigationRow({ label, icon, onPress, destructive = false, busy = false, appearance, divided = false }) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, appearance === 'profile' && styles.profileRow, busy && styles.disabled]}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionCopy}>
        <View style={appearance === 'profile' ? styles.profileIcon : undefined}>
          <Ionicons name={icon} size={21} color={destructive ? '#C62828' : appearance === 'profile' ? '#49704D' : '#4E5A61'} />
        </View>
        <Text
          style={[styles.actionText, appearance === 'profile' && styles.profileText, destructive && styles.destructiveText]}
        >
          {label}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={destructive ? '#C62828' : '#4E5A61'} />
      ) : (
        <Ionicons name="chevron-forward" size={appearance === 'profile' ? 17 : 21} color={destructive ? '#C62828' : '#9AA1A8'} />
      )}
      {appearance === 'profile' && divided ? <View pointerEvents="none" style={styles.profileDivider} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileRow: { minHeight: 64, paddingHorizontal: 14, borderTopWidth: 0 },
  profileIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F0F5F0', alignItems: 'center', justifyContent: 'center' },
  profileText: { fontSize: 15, lineHeight: 21, fontWeight: '500', color: '#303B34' },
  profileDivider: { position: 'absolute', left: 59, right: 14, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#E8EDE9' },
  actionRow: { minHeight: 60, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E3E5', backgroundColor: '#FFFFFF' },
  actionCopy: { flex: 1, minWidth: 0, marginRight: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionText: { flex: 1, paddingVertical: 12, color: '#30363B', fontSize: 16 },
  destructiveText: { color: '#C62828' },
  disabled: { opacity: 0.6 },
});
