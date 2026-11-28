import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrandBug from './components/BrandBug';
import { formatUsd } from './lib/funding';
import { hapticSelect } from './lib/haptics';
import { prefersReducedMotion } from './lib/reduceMotion';
import { colors, fonts } from './lib/theme';

const SITE_CONFIRMATION = 'I can legally access this site and clean safely with my equipment, away from moving traffic and hazardous materials. I will stop if conditions become unsafe.';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

// The step before a cleanup is claimed. It leads with what the person is about to do (the
// butterfly is the Clean bug). The safety guidelines, agreement and release open together
// from one "Read the cleanup agreement" row. Legal requirements (docs/legal-acceptance-and-review.md):
// the full acknowledgment is presented once per document version, so the first time a
// version is accepted it must be opened before the agreement can be ticked; the release keeps
// its own clear heading inside it; and both checkboxes start unticked. Members who already
// accepted this version only confirm the site is safe, as on the website.
function Checkbox({ checked, disabled, onPress, children }) {
  return (
    <TouchableOpacity
      style={[styles.check, checked && styles.checkOn, disabled && styles.checkLocked]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={26} color={checked ? colors.primary : colors.muted} />
      <Text style={styles.checkText}>{children}</Text>
    </TouchableOpacity>
  );
}

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
  const [siteConfirmed, setSiteConfirmed] = useState(false);
  const [open, setOpen] = useState(null);
  const [read, setRead] = useState(() => new Set());
  // Someone who already accepted this version only confirms the site is safe.
  const agreementSaved = Boolean(waiver?.alreadyAccepted);
  // The whole agreement is one section; it must be opened before the agreement can be ticked.
  const allRead = read.has('agreement');
  const ready = (agreementSaved || acknowledged) && siteConfirmed;
  const funded = Number(report?.funded_amount_cents) > 0;

  useEffect(() => {
    setAcknowledged(false);
    setSiteConfirmed(false);
    setOpen(null);
    setRead(new Set());
  }, [visible, waiver?.waiver_version, waiver?.guidelines_version]);

  const toggle = (id) => {
    hapticSelect();
    if (!prefersReducedMotion()) LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    setOpen(current => (current === id ? null : id));
    setRead(current => (current.has(id) ? current : new Set(current).add(id)));
  };

  const updated = waiver?.published_at && Number.isFinite(Date.parse(waiver.published_at))
    ? new Date(waiver.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={accepting}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
            <View style={styles.heroBug}><BrandBug kind="butterfly" size={56} playOnMount /></View>
            <Text style={styles.title} accessibilityRole="header">Let’s clean this spot</Text>
          </View>

          {/* What happens next, in three steps, each in its own colour. */}
          <View style={styles.steps}>
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.stepTime]}><Ionicons name="time-outline" size={20} color={colors.reportInk} /></View>
              <Text style={styles.stepTitle}>Clean it within 24 hours</Text>
            </View>
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.stepPhoto]}><Ionicons name="camera-outline" size={20} color={colors.done} /></View>
              <Text style={styles.stepTitle}>Snap an after photo from the same spot</Text>
            </View>
            <View style={styles.step}>
              <View style={[styles.stepIcon, funded ? styles.stepFund : styles.stepPoints]}>
                {funded ? <BrandBug kind="bee" size={22} /> : <Ionicons name="ribbon-outline" size={20} color={colors.primaryDark} />}
              </View>
              {funded
                ? <Text style={[styles.stepTitle, styles.payTitle]}>Get paid {formatUsd(Number(report.funded_amount_cents))} once approved</Text>
                : <Text style={styles.stepTitle}>Earn 3 points once approved</Text>}
            </View>
          </View>

          {/* As on the website: the full agreement only when this version has not been accepted
              yet; after that, only the site-safety confirmation below. */}
          {agreementSaved ? (
            <Checkbox
              checked={siteConfirmed}
              disabled={accepting}
              onPress={() => { hapticSelect(); setSiteConfirmed(current => !current); }}
            >
              {SITE_CONFIRMATION}
            </Checkbox>
          ) : (
            // First acceptance of this version: one box covers the agreement and this site. It
            // stays locked until the agreement inside it has been opened.
            <View style={[styles.check, styles.checkFirst, acknowledged && styles.checkOn]}>
              <TouchableOpacity
                style={[styles.checkRow, !allRead && styles.checkLocked]}
                onPress={() => { hapticSelect(); const next = !acknowledged; setAcknowledged(next); setSiteConfirmed(next); }}
                disabled={accepting || !allRead}
                activeOpacity={0.8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acknowledged, disabled: accepting || !allRead }}
                accessibilityHint={allRead ? undefined : 'Read the cleanup agreement first'}
              >
                <Ionicons name={!allRead ? 'lock-closed-outline' : acknowledged ? 'checkbox' : 'square-outline'} size={26} color={acknowledged ? colors.primary : colors.muted} />
                <Text style={styles.checkText}>
                  I confirm I am 18 or older. I have read and accept this version of the safety guidelines, funded reward acknowledgment, assumption of risk, and release. {SITE_CONFIRMATION}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.readLink}
                onPress={() => toggle('agreement')}
                accessibilityRole="button"
                accessibilityState={{ expanded: open === 'agreement' }}
                accessibilityLabel={`Read the cleanup agreement${read.has('agreement') ? ', opened' : ''}`}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.readLinkText}>Read the cleanup agreement</Text>
                {read.has('agreement') ? <Ionicons name="checkmark-circle" size={18} color={colors.done} /> : null}
                <Ionicons name={open === 'agreement' ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primaryDark} />
              </TouchableOpacity>
              {open === 'agreement' ? (
                <View style={styles.agreementText}>
                  {updated ? <Text style={styles.updated}>Updated {updated}</Text> : null}
                  <Text style={styles.partTitle}>Stay safe</Text>
                  {waiver?.guidelines_body ? <Text style={styles.sectionText}>{waiver.guidelines_body.trim()}</Text> : null}
                  <Text style={[styles.sectionText, styles.strong]}>Only continue if the location is safe to clean.</Text>
                  <Text style={styles.partTitle}>Cleanup agreement</Text>
                  <Text style={styles.sectionText}>{(waiver?.body ?? '').trim()}</Text>
                  {waiver?.release_body ? <>
                    <Text style={styles.partTitle}>Assumption of risk and release</Text>
                    <Text style={styles.sectionText}>{waiver.release_body.trim()}</Text>
                  </> : null}
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <TouchableOpacity
            style={[styles.startButton, !ready && styles.startButtonDisabled]}
            activeOpacity={0.85}
            onPress={onAccept}
            disabled={!ready || accepting}
            accessibilityRole="button"
            accessibilityLabel="Start my cleanup"
            accessibilityState={{ busy: accepting, disabled: !ready || accepting }}
          >
            <BrandBug kind="butterfly" size={22} />
            <Text style={styles.startButtonText}>Start my cleanup</Text>
            {accepting ? <View style={styles.startSpinner} pointerEvents="none"><ActivityIndicator size="small" color={colors.cleanInk} /></View> : null}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 30 },

  // Lilac, the Clean colour, with the butterfly.
  hero: { paddingTop: 26, paddingBottom: 6, alignItems: 'center' },
  closeButton: { position: 'absolute', top: 12, right: -8, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  heroBug: { alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 12, color: colors.ink, fontSize: 26, lineHeight: 31, fontFamily: fonts.heading, textAlign: 'center' },

  steps: { marginTop: 20, gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stepTime: { backgroundColor: colors.reportSoft, borderColor: colors.reportEdge },
  // The mint family (AGENTS.md): fill #b9e9dd-ish soft mint, border #8ed7c5.
  stepPhoto: { backgroundColor: colors.doneSoft, borderColor: '#8ED7C5' },
  stepFund: { backgroundColor: colors.yellowPale, borderColor: colors.yellowBorder },
  stepPoints: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  stepTitle: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 16, lineHeight: 21, fontFamily: fonts.heading },
  payTitle: { color: colors.gold },


  sectionText: { color: colors.body, fontSize: 14, lineHeight: 21 },
  strong: { fontWeight: '700', color: colors.ink },
  updated: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  partTitle: { marginTop: 6, color: colors.ink, fontSize: 15, fontWeight: '800' },

  check: { marginTop: 14, paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  checkOn: { borderColor: colors.primaryBorder, backgroundColor: colors.primaryTint },
  checkLocked: { opacity: 0.55 },
  checkFirst: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  readLink: { marginTop: 10, marginLeft: 38, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  readLinkText: { color: colors.primaryDark, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  agreementText: { marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line, gap: 8 },
  checkText: { flex: 1, color: colors.body, fontSize: 14, lineHeight: 21 },

  footer: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.white },
  // The Clean button's look (map card and report page): lilac with the butterfly.
  startButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderBottomWidth: 4, borderColor: colors.cleanEdge, backgroundColor: colors.cleanFill },
  startButtonDisabled: { opacity: 0.45 },
  startButtonText: { color: colors.cleanInk, fontSize: 17, fontWeight: '800' },
  startSpinner: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
});
