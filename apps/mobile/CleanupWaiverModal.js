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

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

// The step before a cleanup is claimed. It leads with what the person is about to do (the
// butterfly is the Clean bug), and keeps the safety guidelines, agreement and release in
// sections that open on a tap. Legal requirements (docs/legal-acceptance-and-review.md):
// the full acknowledgment is presented once per document version, so the first time a
// version is accepted every section must be opened before the agreement can be ticked; the
// release keeps its own clearly titled section; and both checkboxes start unticked.
function Section({ id, icon, title, open, read, onToggle, children }) {
  return (
    <View style={[styles.section, open && styles.sectionOpen]}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => onToggle(id)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${read ? ', opened' : ''}`}
      >
        <Ionicons name={icon} size={20} color={colors.body} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {read ? <Ionicons name="checkmark-circle" size={20} color={colors.done} accessibilityElementsHidden /> : null}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </TouchableOpacity>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function Checkbox({ checked, disabled, locked = false, onPress, children }) {
  return (
    <TouchableOpacity
      style={[styles.check, checked && styles.checkOn, disabled && styles.checkLocked]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityHint={locked ? 'Open each section above first' : undefined}
    >
      <Ionicons name={locked ? 'lock-closed-outline' : checked ? 'checkbox' : 'square-outline'} size={26} color={checked ? colors.primary : colors.muted} />
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
  const sections = ['safety', 'agreement', ...(waiver?.release_body ? ['release'] : [])];
  const allRead = sections.every(id => read.has(id));
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
            <View style={styles.heroBug}><BrandBug kind="butterfly" size={46} playOnMount /></View>
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

          <Text style={styles.groupTitle} accessibilityRole="header">Safety and agreement</Text>

          <Section id="safety" icon="shield-checkmark-outline" title="Stay safe" open={open === 'safety'} read={read.has('safety')} onToggle={toggle}>
            {waiver?.guidelines_body ? <Text style={styles.sectionText}>{waiver.guidelines_body.trim()}</Text> : null}
            <Text style={[styles.sectionText, styles.strong]}>Only continue if the location is safe to clean.</Text>
          </Section>
          <Section id="agreement" icon="document-text-outline" title="Cleanup agreement" open={open === 'agreement'} read={read.has('agreement')} onToggle={toggle}>
            {updated ? <Text style={styles.updated}>Updated {updated}</Text> : null}
            <Text style={styles.sectionText}>{(waiver?.body ?? '').trim()}</Text>
          </Section>
          {waiver?.release_body ? (
            <Section id="release" icon="alert-circle-outline" title="Assumption of risk and release" open={open === 'release'} read={read.has('release')} onToggle={toggle}>
              <Text style={styles.sectionText}>{waiver.release_body.trim()}</Text>
            </Section>
          ) : null}

          {agreementSaved ? null : (
            <Checkbox
              checked={acknowledged}
              disabled={accepting || !allRead}
              locked={!allRead}
              onPress={() => { hapticSelect(); setAcknowledged(current => !current); }}
            >
              I confirm I am 18 or older. I have read and accept this version of the safety guidelines, funded reward acknowledgment, assumption of risk, and release.
            </Checkbox>
          )}
          <Checkbox
            checked={siteConfirmed}
            disabled={accepting}
            onPress={() => { hapticSelect(); setSiteConfirmed(current => !current); }}
          >
            I can legally access this site and clean safely with my equipment, away from moving traffic and hazardous materials. I will stop if conditions become unsafe.
          </Checkbox>
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
  heroBug: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cleanFill, borderWidth: 2, borderColor: colors.cleanEdge },
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

  groupTitle: { marginTop: 28, marginBottom: 2, color: colors.ink, fontSize: 17, lineHeight: 22, fontFamily: fonts.heading },

  section: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  sectionOpen: { borderColor: colors.lineStrong },
  sectionHeader: { minHeight: 54, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '700' },
  sectionBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  sectionText: { color: colors.body, fontSize: 14, lineHeight: 21 },
  strong: { fontWeight: '700', color: colors.ink },
  updated: { color: colors.muted, fontSize: 12, fontWeight: '600' },

  check: { marginTop: 14, paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  checkOn: { borderColor: colors.primaryBorder, backgroundColor: colors.primaryTint },
  checkLocked: { opacity: 0.5 },
  checkText: { flex: 1, color: colors.body, fontSize: 14, lineHeight: 21 },

  footer: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.white },
  // The Clean button's look (map card and report page): lilac with the butterfly.
  startButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderBottomWidth: 4, borderColor: colors.cleanEdge, backgroundColor: colors.cleanFill },
  startButtonDisabled: { opacity: 0.45 },
  startButtonText: { color: colors.cleanInk, fontSize: 17, fontWeight: '800' },
  startSpinner: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
});
