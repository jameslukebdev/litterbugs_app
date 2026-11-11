import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RANKS } from '../lib/ranking';
import { POINTS_RULES, POINTS_LIMITS } from '../lib/pointsExplanation';
import SlideUp from './SlideUp';
import { colors, fonts } from '../lib/theme';

export default function PointsExplanation({ ranking, appearance }) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="How points work" style={[styles.trigger, appearance === 'row' && styles.rowTrigger]} onPress={() => setVisible(true)}>
      <Ionicons name="help-circle-outline" size={18} color={colors.primaryDark} />
      <Text style={[styles.action, appearance === 'row' && styles.rowAction]}>How points work</Text>
      {appearance === 'row' ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
    </TouchableOpacity>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} accessibilityLabel="Dismiss points explanation" />
        <SlideUp open={visible} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>How points work</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close points explanation" onPress={() => setVisible(false)} style={styles.close}><Ionicons name="close" size={24} color={colors.ink} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.copy}>Community points recognize your reporting and cleanup activity over time. Contributions do not earn points.</Text>
            {POINTS_RULES.map(rule => <View key={rule.title} style={styles.rule}>
              <Text style={styles.ruleTitle}>{rule.title} · {rule.award}</Text>
              <Text style={styles.copy}>{rule.detail}</Text>
            </View>)}
            <Text style={styles.copy}>{POINTS_LIMITS}</Text>
            <Text style={styles.copy}>Your rank reflects points earned over time. My reports counts the reports currently shown in your account.</Text>
            <Text style={styles.section}>Your next milestone</Text>
            <Text style={styles.copy}>{!ranking ? 'Your profile shows your current rank once it finishes loading.' : ranking.nextRank ? `${ranking.pointsRemaining} ${ranking.pointsRemaining === 1 ? 'point' : 'points'} to ${ranking.nextRank} (${ranking.nextRankAt} total points). The progress bar measures progress from your current rank to the next.` : 'You’ve reached Dragonfly, the highest current rank. You can keep earning points.'}</Text>
            <Text style={styles.section}>Community ranks</Text>
            {RANKS.map(rank => <View key={rank.id} style={styles.rank}><Text style={styles.copy}>{rank.name}</Text><Text style={styles.copy}>{rank.minPoints} {rank.minPoints === 1 ? 'point' : 'points'}</Text></View>)}
          </ScrollView>
        </SlideUp>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  rowTrigger: { alignSelf: 'stretch', minHeight: 46, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.primaryBorder, backgroundColor: colors.white, gap: 8 },
  rowAction: { flex: 1, fontSize: 13, fontWeight: '500' },
  trigger: { minHeight: 44, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16 },
  action: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  sheet: { maxHeight: '85%', backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 22, paddingRight: 10, paddingTop: 10 },
  title: { flex: 1, fontSize: 22, fontFamily: fonts.heading, color: colors.ink },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 22, paddingTop: 12, gap: 12 },
  copy: { color: colors.body, fontSize: 15, lineHeight: 22, flexShrink: 1 },
  rule: { padding: 16, backgroundColor: colors.primarySoft, borderRadius: 14, gap: 6 },
  ruleTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
  section: { marginTop: 8, color: colors.ink, fontSize: 17, fontWeight: '700' },
  rank: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
});
