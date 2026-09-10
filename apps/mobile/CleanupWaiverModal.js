import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Cleanup safety and agreement</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={accepting}
            accessibilityRole="button"
            accessibilityLabel="Close cleanup acknowledgment"
          >
            <Ionicons name="close" size={25} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
        >
          {report ? <View style={styles.reportSummary}>
            <Text style={styles.reportTitle}>{report.title || 'This cleanup'}</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="cash-outline" size={20} color="#687178" />
              <Text style={styles.summaryText}>{reportPresentation(report).funding}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="time-outline" size={20} color="#687178" />
              <Text style={styles.summaryText}>You’ll have 24 hours to finish and submit 1–3 after photos.</Text>
            </View>
            {Number(report.funded_amount_cents) > 0 ? (
              <View style={styles.summaryRow}>
                <Ionicons name="wallet-outline" size={20} color="#687178" />
                <Text style={styles.summaryText}>Payout setup is required before reserving a funded cleanup. Your reward is paid after approval.</Text>
              </View>
            ) : <Text style={styles.summaryText}>There is currently no funded reward.</Text>}
            <View style={styles.safetyNotice}>
              <Ionicons name="warning-outline" size={18} color="#805900" />
              <Text style={styles.safetyNoticeText}>Only continue if the location is safe to clean.</Text>
            </View>
            <Text style={styles.claimNote}>Reading this acknowledgment does not reserve the cleanup. You’ll confirm your claim afterward.</Text>
          </View> : null}
          <Text style={styles.body}>{waiver?.body ?? ''}</Text>

          {waiver?.guidelines_body ? (
            <View style={styles.guidelinesCard}>
              <Text style={styles.guidelinesTitle}>Cleanup safety guidelines</Text>
              <Text style={styles.guidelinesBody}>{waiver.guidelines_body}</Text>
            </View>
          ) : null}

          {waiver?.release_body ? (
            <View style={styles.releaseCard}>
              <Text style={styles.releaseTitle}>Assumption of risk and release</Text>
              <Text style={styles.releaseBody}>{waiver.release_body}</Text>
            </View>
          ) : null}

          {waiver?.published_at && Number.isFinite(Date.parse(waiver.published_at)) ? <Text style={{ color: '#687178', fontSize: 13, marginVertical: 12 }}>
            Updated {new Date(waiver.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text> : null}

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
              color={acknowledged ? '#2F7D32' : '#7A8288'}
            />
            <Text style={styles.acknowledgmentText}>
              I confirm I am 18 or older. I have read and accept the safety guidelines and funded reward acknowledgment, including the assumption of risk and release, for this claim.
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
            {accepting ? <View style={styles.acceptSpinner} pointerEvents="none"><ActivityIndicator size="small" color="#FFFFFF" /></View> : null}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    minHeight: 76,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE1E3',
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: '#9A6700', fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: '#1F2937', fontSize: 22, lineHeight: 28, fontWeight: '700' },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F5F4', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 34 },
  reportSummary: { paddingBottom: 22, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#E8ECE9' },
  reportTitle: { color: '#303A34', fontSize: 16, lineHeight: 22, fontWeight: '600', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  summaryText: { flex: 1, color: '#4F5C63', fontSize: 14, lineHeight: 21 },
  safetyNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 10, backgroundColor: '#FFF7E5' },
  safetyNoticeText: { flex: 1, color: '#805900', fontSize: 13, lineHeight: 19, fontWeight: '500' },
  claimNote: { marginTop: 14, color: '#687178', fontSize: 13, lineHeight: 19 },
  body: { color: '#30363B', fontSize: 16, lineHeight: 25 },
  guidelinesCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E7E3',
    backgroundColor: '#F7F9F7',
  },
  guidelinesTitle: { color: '#303A34', fontSize: 17, lineHeight: 23, fontWeight: '400' },
  guidelinesBody: { marginTop: 10, color: '#30363B', fontSize: 15, lineHeight: 23 },
  releaseCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A23A2A',
    backgroundColor: '#FFF4F1',
  },
  releaseTitle: {
    color: '#7C2418',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  releaseBody: { marginTop: 8, color: '#49251F', fontSize: 15, lineHeight: 23, fontWeight: '400' },
  versionCard: { marginTop: 24, padding: 15, borderRadius: 14, backgroundColor: '#F5F6F7' },
  versionLabel: { color: '#6B7379', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  versionValue: { marginTop: 4, color: '#30363B', fontSize: 14, fontWeight: '700' },
  versionSpacing: { marginTop: 14 },
  acknowledgmentRow: {
    marginTop: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C8D8C9',
    borderRadius: 14,
    backgroundColor: '#F4FAF4',
  },
  acknowledgmentText: { flex: 1, color: '#244A27', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDE1E3',
    backgroundColor: '#FFFFFF',
  },
  acceptButton: {
    minHeight: 54,
    paddingHorizontal: 36,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#2F7D32',
  },
  acceptButtonDisabled: { opacity: 0.45 },
  acceptButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  acceptSpinner: { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' },
});
