import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const logo = require('./assets/LB_Logo_PNG.png');

function ShareOption({
  accessibilityLabel,
  busy,
  description,
  icon,
  iconColor,
  onPress,
  title,
}) {
  return (
    <TouchableOpacity
      style={[styles.option, busy && styles.optionBusy]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy, disabled: busy }}
    >
      <View style={[styles.optionIcon, { backgroundColor: `${iconColor}14` }]}>
        {busy ? (
          <ActivityIndicator color={iconColor} />
        ) : (
          <Ionicons name={icon} size={23} color={iconColor} />
        )}
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#788178" />
    </TouchableOpacity>
  );
}

export default function ReportShareSheet({
  busyAction = null,
  onClose,
  onSystemShare,
  onInstagramStory,
  previewPhotoUrl = null,
  report,
  visible,
}) {
  const insets = useSafeAreaInsets();
  const completed = report?.cleanup_state === 'completed';
  const title = report?.title?.trim() || 'Litter Report';
  const litterType = report?.litter_types?.[0] || report?.types || null;
  const details = [
    report?.severity ? `${report.severity} severity` : null,
    litterType,
  ].filter(Boolean).join(' · ');
  const busy = Boolean(busyAction);

  if (!visible) return null;

  return (
    <View
      style={styles.backdrop}
      accessibilityViewIsModal
      accessibilityLabel={completed ? 'Share cleanup' : 'Share report'}
    >
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.heading}>
                {completed ? 'Share cleanup' : 'Share report'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Close share options"
            >
              <Ionicons name="close" size={23} color="#263129" />
            </TouchableOpacity>
          </View>

          <View style={styles.preview} accessibilityLabel={`Report being shared: ${title}`}>
            <View style={styles.previewMedia}>
              <Image
                source={previewPhotoUrl ? { uri: previewPhotoUrl } : logo}
                style={previewPhotoUrl ? styles.previewPhoto : styles.previewLogo}
                resizeMode={previewPhotoUrl ? 'cover' : 'contain'}
                accessibilityIgnoresInvertColors
              />
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewEyebrow}>{completed ? 'Cleanup complete' : 'Cleanup needed'}</Text>
              <Text style={styles.previewTitle} numberOfLines={2}>{title}</Text>
              {details ? <Text style={styles.previewDetails} numberOfLines={1}>{details}</Text> : null}
            </View>
          </View>

          <View style={styles.options}>
            <ShareOption
              accessibilityLabel="Share to Instagram Stories"
              busy={busy}
              description="Open a Story draft with the report card"
              icon="logo-instagram"
              iconColor="#C13584"
              onPress={onInstagramStory}
              title="Instagram Stories"
            />
            <ShareOption
              accessibilityLabel="Share report"
              busy={busy}
              description="Messages, Mail, and more"
              icon="share-outline"
              iconColor="#2F7D32"
              onPress={onSystemShare}
              title="Choose where to share"
            />
          </View>

          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#617066" />
            <Text style={styles.privacyText}>
              Exact coordinates and private account details stay off the shared card.
            </Text>
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(13, 22, 16, 0.42)',
    zIndex: 50,
  },
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#FFFFFF',
    shadowColor: '#07150B',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 24,
  },
  handle: {
    width: 42,
    height: 5,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 3,
    backgroundColor: '#D7DED8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerCopy: { flex: 1 },
  heading: {
    color: '#182019',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.45,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#F3F5F4',
  },
  preview: {
    minHeight: 104,
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 18,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
  },
  previewMedia: {
    width: 88,
    height: 88,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#EAF0EB',
  },
  previewPhoto: { width: 88, height: 88 },
  previewLogo: { width: 68, height: 54 },
  previewCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
    paddingLeft: 14,
    paddingVertical: 8,
  },
  previewEyebrow: {
    color: '#667268',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  },
  previewTitle: { color: '#263129', fontSize: 16, lineHeight: 21, fontWeight: '600' },
  previewDetails: { color: '#5C675E', fontSize: 12 },
  options: { gap: 10, paddingHorizontal: 20 },
  option: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D9DFDA',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  optionBusy: { opacity: 0.74 },
  optionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  optionCopy: { flex: 1, gap: 2 },
  optionTitle: { color: '#243027', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  optionDescription: { color: '#68736A', fontSize: 12, lineHeight: 16 },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 18,
    marginHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E7E3',
  },
  privacyText: { flex: 1, color: '#68736A', fontSize: 11, lineHeight: 15 },
});
