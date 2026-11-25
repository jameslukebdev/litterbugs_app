import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../lib/theme';

export function IssueUtility({ label = 'Cleanup options', onPress, disabled = false, expanded }) {
  return <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled, ...(expanded === undefined ? {} : { expanded }) }} style={[issueStyles.utility, disabled && { opacity: 0.5 }]}>
    <Ionicons name="flag-outline" size={19} color={colors.cleanInk} />
    <Text style={issueStyles.utilityText}>{label}</Text>
    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.cleanInk} />
  </TouchableOpacity>;
}
export function IssueNotice({ label, onPress, resolved = false }) {
  return <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. View conversation`}
    style={[issueStyles.notice, resolved && { backgroundColor: '#b9e9dd' }]}>
    <Ionicons name="lock-closed-outline" size={17} color={colors.reportInk} />
    <View style={{ flex: 1 }}><Text style={issueStyles.noticeText}>{label}</Text><Text style={issueStyles.link}>View conversation</Text></View>
    <Ionicons name="chevron-forward" size={17} color={colors.reportInk} />
  </TouchableOpacity>;
}
export const issueStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: 22, gap: 20, paddingBottom: 40 },
  title: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 23, color: colors.muted },
  label: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: colors.ink },
  text: { fontSize: 16, lineHeight: 24, color: colors.body },
  input: { minHeight: 110, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: 14, padding: 14, fontSize: 16, lineHeight: 24, color: colors.ink, backgroundColor: colors.white },
  field: { gap: 9 },
  choice: { minHeight: 48, paddingVertical: 12, flexDirection: 'row', gap: 12, alignItems: 'center' },
  utility: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 46, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.cleanEdge, borderBottomWidth: 3, borderRadius: 13, backgroundColor: colors.cleanFill },
  utilityText: { fontWeight: '700', fontSize: 15, color: colors.cleanInk },
  notice: { borderRadius: 14, backgroundColor: colors.reportSoft, padding: 15, flexDirection: 'row', gap: 10, alignItems: 'center' },
  noticeText: { color: colors.reportInk, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  link: { fontSize: 14, color: colors.reportInk, lineHeight: 21 },
  message: { borderRadius: 16, padding: 17, backgroundColor: colors.soft, gap: 10 },
  author: { fontWeight: '700', fontSize: 14, color: colors.ink },
  time: { fontSize: 12, color: colors.muted },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 95, height: 110, borderRadius: 12 },
  tag: { alignSelf: 'flex-start', backgroundColor: colors.reportSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
});
