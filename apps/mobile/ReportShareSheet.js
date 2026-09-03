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
  onInstagramStory,
  onSystemShare,
  previewPhotoUrl = null,
  report,
  visible,
}) {
  const insets = useSafeAreaInsets();
  const completed = report?.cleanup_state === 'completed';
  const title = report?.title?.trim() || 'Litter Report';
  const litterType = report?.litter_types?.[0] || report?.types || null;
  const details = [
    report?.severity ? `${report.severity} priority` : null,
    litterType,
  ].filter(Boolean).join(' · ');
  const busy = Boolean(busyAction);

  if (!visible) return null;

  return (
    <View
      style={styles.backdrop}
      accessibilityViewIsModal
      accessibilityLabel={completed ? 'Share your cleanup impact' : 'Share this cleanup report'}
    >
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Share a Litterbugs report</Text>
              <Text style={styles.heading}>
                {completed ? 'Share your cleanup impact' : 'Share this cleanup report'}
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
              <Text style={styles.previewTitle} numberOfLines={1}>{title}</Text>
              {details ? <Text style={styles.previewDetails} numberOfLines={1}>{details}</Text> : null}
            </View>
          </View>

          <View style={styles.options}>
            <ShareOption
              accessibilityLabel="Share to Instagram Stories"
              busy={busyAction === 'instagram'}
              description="Open a Story draft with the branded report card"
              icon="logo-instagram"
              iconColor="#C13584"
              onPress={onInstagramStory}
              title="Instagram Stories"
            />
            <ShareOption
              accessibilityLabel="Share with another app"
              busy={busyAction === 'system'}
              description="Messages, Mail, Facebook, Instagram posts, and more"
              icon="share-social-outline"
              iconColor="#C9302C"
              onPress={onSystemShare}
              title="More sharing options"
            />
          </View>

          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#617066" />
            <Text style={styles.privacyText}>
              Shared cards omit exact coordinates and private account details.
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
    backgroundColor: 'rgba(13, 22, 16, 0.58)',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    marginBottom: 5,
    color: '#C9302C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.05,
    textTransform: 'uppercase',
  },
  heading: {
    color: '#182019',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.45,
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D7DED8',
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
  },
  preview: {
    height: 92,
    flexDirection: 'row',
    marginHorizontal: 22,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DFE5E0',
    borderRadius: 15,
    backgroundColor: '#F5F7F5',
  },
  previewMedia: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#EAF0EB',
  },
  previewPhoto: { width: 92, height: 92 },
  previewLogo: { width: 68, height: 54 },
  previewCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  previewEyebrow: {
    color: '#667268',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  previewTitle: { color: '#182019', fontSize: 16, fontWeight: '800' },
  previewDetails: { color: '#5C675E', fontSize: 12 },
  options: { gap: 10, paddingHorizontal: 22 },
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
  optionTitle: { color: '#243027', fontSize: 15, fontWeight: '800' },
  optionDescription: { color: '#68736A', fontSize: 12, lineHeight: 16 },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 18,
    marginHorizontal: 22,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E7E3',
  },
  privacyText: { flex: 1, color: '#68736A', fontSize: 11, lineHeight: 15 },
});
