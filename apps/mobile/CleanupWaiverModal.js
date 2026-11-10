import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { reportPresentation } from './lib/reportPresentation';
import { colors, fonts } from './lib/theme';


export default function CleanupWaiverModal({
  visible,
  waiver,
  report,
  accepting,
  onAccept,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    setAcknowledged(false);
  }, [visible, waiver?.waiver_version, waiver?.guidelines_version]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          {/* Website claim step: the caterpillar labels "Before you start", with the report under it. */}
          <Image source={require('./assets/bugs/caterpillar.png')} style={styles.headerBug} resizeMode="contain" accessible={false} />
          <View style={styles.headerCopy}>
            <Text style={styles.title} accessibilityRole="header">Before you start</Text>
            {report ? <Text style={styles.headerReport} numberOfLines={2}>{report.title || 'This cleanup'}</Text> : null}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={accepting}
            accessibilityRole="button"
            accessibilityLabel="Close cleanup acknowledgment"
          >
            <Ionicons name="close" size={25} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
        >
          {report ? <View style={styles.reportSummary}>
            {/* Facts as soft chips, as on the website; colour comes from the chip words. */}
            <View style={styles.factChip}>
              <Ionicons name="calendar-outline" size={16} color="#24521F" />
              <Text style={styles.factText}>You’ll have 24 hours to finish and submit 1–3 after photos.</Text>
            </View>
            {Number(report.funded_amount_cents) > 0 ? (
              <>
                <View style={[styles.factChip, styles.payChip]}>
                  <Text style={[styles.factText, styles.payText]}>{reportPresentation(report).funding}</Text>
                </View>
                <Text style={styles.summaryText}>Payout setup is required before reserving a funded cleanup. Your reward is paid after approval.</Text>
              </>
            ) : <Text style={styles.summaryText}>There is currently no funded reward.</Text>}
            <Text style={styles.claimNote}>Reading this acknowledgment does not reserve the cleanup. You’ll confirm your claim afterward.</Text>
          </View> : null}

          {waiver?.guidelines_body ? (
            <View style={styles.guidelinesCard}>
              <Text style={styles.guidelinesTitle}>Stay safe</Text>
              <Text style={styles.guidelinesBody}>{waiver.guidelines_body}</Text>
              <Text style={[styles.guidelinesBody, { fontWeight: '700' }]}>Only continue if the location is safe to clean.</Text>
            </View>
          ) : (
            <View style={styles.guidelinesCard}>
              <Text style={styles.guidelinesTitle}>Stay safe</Text>
              <Text style={styles.guidelinesBody}>Only continue if the location is safe to clean.</Text>
            </View>
          )}

          <View style={styles.agreementHeading}>
            <Text style={styles.agreementTitle}>Cleanup agreement</Text>
            {waiver?.published_at && Number.isFinite(Date.parse(waiver.published_at)) ? <Text style={styles.agreementUpdated}>
              Updated {new Date(waiver.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text> : null}
          </View>
          <Text style={styles.body}>{waiver?.body ?? ''}</Text>

          {waiver?.release_body ? (
            <View style={styles.releaseCard}>
              <Text style={styles.releaseTitle}>Assumption of risk and release</Text>
              <Text style={styles.releaseBody}>{waiver.release_body}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.acknowledgmentRow}
            onPress={() => setAcknowledged((current) => !current)}
            disabled={accepting}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
          >
            <Ionicons
              name={acknowledged ? 'checkbox' : 'square-outline'}
              size={27}
              color={acknowledged ? colors.primary : colors.muted}
            />
            <Text style={styles.acknowledgmentText}>
              I confirm I am 18 or older. I have read and accept this version of the safety guidelines and funded reward acknowledgment, including the assumption of risk and release.
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              !acknowledged && styles.acceptButtonDisabled,
            ]}
            activeOpacity={1}
            onPress={onAccept}
            disabled={!acknowledged || accepting}
            accessibilityRole="button"
            accessibilityLabel="Accept cleanup acknowledgment and continue"
            accessibilityState={{ busy: accepting, disabled: !acknowledged || accepting }}
          >
            <Text style={styles.acceptButtonText}>Accept and review claim</Text>
            {accepting ? <View style={styles.acceptSpinner} pointerEvents="none"><ActivityIndicator size="small" color={colors.white} /></View> : null}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    minHeight: 76,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headerBug: { width: 40, height: 40, marginRight: 10 },
  headerReport: { marginTop: 2, color: colors.muted, fontSize: 14, lineHeight: 21 },
  factChip: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#ECF6E3' },
  factText: { flexShrink: 1, color: '#24521F', fontSize: 14, fontWeight: '800' },
  payChip: { backgroundColor: '#FFF0F1' },
  payText: { color: '#A8323B' },
  agreementHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 10, marginBottom: 8 },
  agreementTitle: { color: colors.ink, fontSize: 17, fontFamily: fonts.heading },
  agreementUpdated: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  headerCopy: { flex: 1, paddingRight: 12 },
  title: { color: colors.ink, fontSize: 20, lineHeight: 24, fontFamily: fonts.heading },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 34 },
  reportSummary: { gap: 10, marginBottom: 20 },
  summaryText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  claimNote: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19.5 },
  guidelinesCard: { marginBottom: 22, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, borderWidth: 2, borderColor: '#B8E198', backgroundColor: '#F6FBF1' },
  guidelinesTitle: { color: '#2F6B3A', fontSize: 17, lineHeight: 22, fontFamily: fonts.heading },
  guidelinesBody: { marginTop: 6, color: '#3B4A36', fontSize: 14, lineHeight: 21.7 },
  releaseCard: { marginTop: 14 },
  releaseTitle: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  releaseBody: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 19.5 },
  acknowledgmentRow: { marginTop: 22, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 2, borderColor: '#ECE8F8', borderRadius: 16, backgroundColor: colors.white },
  acknowledgmentText: { flex: 1, color: '#45434D', fontSize: 14, lineHeight: 21 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  acceptButton: { minHeight: 52, paddingHorizontal: 36, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primary },
  acceptButtonDisabled: { opacity: 0.45 },
  acceptButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  acceptSpinner: { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' },
});
