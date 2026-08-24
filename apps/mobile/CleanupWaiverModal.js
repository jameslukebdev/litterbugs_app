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

export default function CleanupWaiverModal({
  visible,
  waiver,
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
            <Text style={styles.eyebrow}>DEVELOPMENT VERSION</Text>
            <Text style={styles.title}>{waiver?.title ?? 'Cleanup acknowledgment'}</Text>
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.warningCard}>
            <Ionicons name="construct-outline" size={22} color="#9A6700" />
            <Text style={styles.warningText}>
              This placeholder is for product testing only and requires lawyer review before public release.
            </Text>
          </View>

          <Text style={styles.body}>{waiver?.body ?? ''}</Text>

          <View style={styles.versionCard}>
            <Text style={styles.versionLabel}>Waiver version</Text>
            <Text style={styles.versionValue}>{waiver?.waiver_version}</Text>
            <Text style={[styles.versionLabel, styles.versionSpacing]}>Safety guidelines version</Text>
            <Text style={styles.versionValue}>{waiver?.guidelines_version}</Text>
          </View>

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
              I have read and explicitly accept this development waiver and safety guidance.
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              (!acknowledged || accepting) && styles.acceptButtonDisabled,
            ]}
            onPress={onAccept}
            disabled={!acknowledged || accepting}
            accessibilityRole="button"
            accessibilityLabel="Accept cleanup acknowledgment and continue"
          >
            {accepting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.acceptButtonText}>Accept and Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    minHeight: 88,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE1E3',
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: '#9A6700', fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  title: { marginTop: 5, color: '#1F2937', fontSize: 22, lineHeight: 28, fontWeight: '800' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 34 },
  warningCard: {
    padding: 15,
    flexDirection: 'row',
    gap: 11,
    borderWidth: 1,
    borderColor: '#F0D58C',
    borderRadius: 14,
    backgroundColor: '#FFF8E1',
  },
  warningText: { flex: 1, color: '#6B4F00', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  body: { marginTop: 22, color: '#30363B', fontSize: 16, lineHeight: 25 },
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
  acknowledgmentText: { flex: 1, color: '#244A27', fontSize: 15, lineHeight: 22, fontWeight: '700' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDE1E3',
    backgroundColor: '#FFFFFF',
  },
  acceptButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#2F7D32',
  },
  acceptButtonDisabled: { opacity: 0.45 },
  acceptButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
