import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
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
        {/* Website profile links are words only; other rows keep their icon. */}
        {appearance === 'profile' ? null : <Ionicons name={icon} size={21} color={destructive ? colors.red : colors.body} />}
        <Text
          style={[styles.actionText, appearance === 'profile' && styles.profileText, destructive && styles.destructiveText]}
        >
          {label}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={destructive ? colors.red : colors.body} />
      ) : (
        <Ionicons name="chevron-forward" size={appearance === 'profile' ? 17 : 21} color={destructive ? colors.red : colors.subtle} />
      )}
      {appearance === 'profile' && divided ? <View pointerEvents="none" style={styles.profileDivider} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileRow: { minHeight: 56, paddingHorizontal: 18, borderTopWidth: 0 },
  profileText: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: colors.ink },
  profileDivider: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  actionRow: { minHeight: 60, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.white },
  actionCopy: { flex: 1, minWidth: 0, marginRight: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionText: { flex: 1, paddingVertical: 12, color: colors.ink, fontSize: 16 },
  destructiveText: { color: colors.red },
  disabled: { opacity: 0.6 },
});
