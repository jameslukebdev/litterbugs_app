import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrandBug from './BrandBug';
import MapPin from './MapPin';
import { PrimaryButton } from './ui';
import { trackFirstRun } from '../lib/analytics';
import { hapticTap } from '../lib/haptics';
import { TOUR_STEPS } from '../lib/firstRun';
import { prefersReducedMotion } from '../lib/reduceMotion';
import { colors, fonts } from '../lib/theme';

// A four-step walk through the map, shown once after the welcome and again from
// Profile > How Litterbugs works. Each step dims the map, lights up the one button it is
// about, and that action's own bug sits on the button: the dragonfly on Report Litter,
// the bee on Fund, the butterfly on Clean. The step in between lights up a ladybug pin,
// because tapping one is how you reach Fund and Clean. Those steps use an example spot (a
// ladybug pin and a card laid out like the map's real one), so the tour works even where the map has no reports yet.
// Nothing in the tour can post, pay or claim.

// A soft purple outline that breathes around the lit button, with its bug on the corner.
function Highlight({ bug, radius, children, style, onPress, label, onCard = false }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const beat = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    beat.start();
    return () => beat.stop();
  }, [pulse]);
  return (
    <TouchableOpacity style={style} activeOpacity={0.85} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.ring, onCard && styles.ringOnCard, { borderRadius: radius + 7, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }] }]} />
      {bug ? <Animated.View pointerEvents="none" style={[styles.guide, onCard && styles.guideOnCard, { transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]}>
        <BrandBug kind={bug} size={38} loop />
      </Animated.View> : null}
    </TouchableOpacity>
  );
}

function Coach({ step, index, onNext, onSkip, style }) {
  const last = index === TOUR_STEPS.length - 1;
  return (
    <View style={[styles.coach, style]} accessibilityLiveRegion="polite">
      <View style={styles.coachTop}>
        <View style={[styles.coachBug, { backgroundColor: step.fill, borderColor: step.edge }]}><BrandBug kind={step.bug} size={30} playOnMount /></View>
        <View style={styles.coachCopy}>
          <Text style={[styles.coachTitle, { color: step.ink }]} accessibilityRole="header">{step.title}</Text>
          <Text style={styles.coachLine}>{step.tour}</Text>
        </View>
      </View>
      <View style={styles.coachBottom}>
        <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${TOUR_STEPS.length}`}>
          {TOUR_STEPS.map((item, dot) => <View key={item.key} style={[styles.dot, dot === index && styles.dotOn]} />)}
        </View>
        <View style={styles.coachActions}>
          {last ? null : <TouchableOpacity style={styles.skip} onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip the tour"><Text style={styles.skipText}>Skip</Text></TouchableOpacity>}
          <PrimaryButton label={last ? 'Got it' : 'Next'} onPress={onNext} style={styles.next} />
        </View>
      </View>
    </View>
  );
}

/** `reportButton`: where the map's real Report Litter button sits ({ right, bottom, width, height }). */
export default function FirstRunTour({ visible, replay = false, reportButton, onDone }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const enter = useRef(new Animated.Value(0)).current;
  const spot = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (visible) { setIndex(0); trackFirstRun(replay ? 'tour_replayed' : 'tour_started'); } }, [visible]);
  useEffect(() => { if (visible) trackFirstRun('tour_step', TOUR_STEPS[index].key); }, [visible, index]);
  // Each step's words and lit button ease in; the example spot lands once, on step two.
  useEffect(() => {
    if (!visible) return undefined;
    if (prefersReducedMotion()) { enter.setValue(1); spot.setValue(index > 0 ? 1 : 0); card.setValue(index > 1 ? 1 : 0); return undefined; }
    // The words ease in when their box appears or moves (steps one and two). On the card
    // steps the box stays put, so only its words change: fading it out and in would blink.
    const moves = [];
    if (index < 2) {
      enter.setValue(0);
      moves.push(Animated.timing(enter, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }));
    } else enter.setValue(1);
    // The ladybug pin lands on step two; tapping it (step three) raises its card.
    if (index === 0) { spot.setValue(0); card.setValue(0); }
    if (index === 1) { spot.setValue(0); card.setValue(0); moves.push(Animated.spring(spot, { toValue: 1, delay: 150, damping: 11, stiffness: 170, useNativeDriver: true })); }
    if (index === 2) { card.setValue(0); moves.push(Animated.spring(card, { toValue: 1, damping: 16, stiffness: 170, useNativeDriver: true })); }
    const running = Animated.parallel(moves);
    running.start();
    return () => running.stop();
  }, [visible, index, enter, spot, card]);

  const step = TOUR_STEPS[index];
  const next = () => { hapticTap(); if (index === TOUR_STEPS.length - 1) { trackFirstRun('tour_finished'); onDone(); } else setIndex(index + 1); };
  const skip = () => { trackFirstRun('tour_skipped', TOUR_STEPS[index].key); onDone(); };
  const rise = { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };
  const onSpot = index > 0;
  // Short phones get a shorter example photo and no priority row, so the pin and card
  // always sit clear of the words above them.
  const room = height - insets.top - reportButton.bottom;
  const compact = room < 600;
  const photoHeight = Math.max(70, Math.min(150, room - (compact ? 470 : 566)));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={skip} statusBarTranslucent>
      <View style={styles.dim}>
        {!onSpot ? <>
          <Animated.View style={[styles.coachDock, { bottom: reportButton.bottom + reportButton.height + 34 }, rise]}>
            <Coach step={step} index={index} onNext={next} onSkip={skip} />
          </Animated.View>
          {/* Drawn exactly over the map's own Report Litter button. */}
          <Highlight bug="dragonfly" radius={25} onPress={next} label="Report Litter" style={[styles.reportButton, { right: reportButton.right, bottom: reportButton.bottom, width: reportButton.width, height: reportButton.height }]}>
            <View style={styles.reportBugSpace} />
            <Text style={styles.reportText} numberOfLines={1} allowFontScaling={false}>Report Litter</Text>
          </Highlight>
        </> : <>
          <Animated.View style={[styles.coachDock, { top: insets.top + 14 }, rise]}>
            <Coach step={step} index={index} onNext={next} onSkip={skip} />
          </Animated.View>
          <View style={[styles.spot, { bottom: reportButton.bottom }]}>
            {/* The ladybug you would tap on the map: a spot that needs a cleanup, with $6 in its fund. */}
            <Animated.View style={[styles.spotPin, { opacity: spot, transform: [{ translateY: spot.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }] }]}>
              {index === 1
                ? <Highlight radius={22} onPress={next} label="Open this spot" style={styles.spotPinLit}><MapPin kind="open" text="$6" /></Highlight>
                : <MapPin kind="open" text="$6" selected />}
            </Animated.View>
            <Animated.View pointerEvents={index > 1 ? 'auto' : 'none'} style={[styles.card, { opacity: card, transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
              <View style={[styles.photo, { height: photoHeight }]}>
                <Image source={require('../assets/tour-example-spot.jpg')} style={styles.photoImage} resizeMode="cover" accessible={false} />
                <View style={styles.badge}><BrandBug kind="ladybug" size={15} /><Text style={styles.badgeText} allowFontScaling={false}>Available</Text></View>
                <View style={styles.example}><Text style={styles.exampleText} allowFontScaling={false}>Example</Text></View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>Cardboard and packaging by the road</Text>
                <View style={styles.pays}><BrandBug kind="bee" size={17} /><Text style={styles.paysText}>Pays $6</Text></View>
                <Text style={styles.summary} numberOfLines={1}>0.4 mi · Cardboard · Paper products · Near roadside</Text>
                <View style={styles.actions}>
                  {index === 2
                    ? <Highlight onCard bug="bee" radius={14} onPress={next} label="Fund" style={[styles.action, styles.fund]}><BrandBug kind="bee" size={21} /><Text style={[styles.actionText, { color: colors.fundInk }]}>Fund</Text></Highlight>
                    : <View style={[styles.action, styles.fund, styles.resting]}><BrandBug kind="bee" size={21} /><Text style={[styles.actionText, { color: colors.fundInk }]}>Fund</Text></View>}
                  {index === 3
                    ? <Highlight onCard bug="butterfly" radius={14} onPress={next} label="Clean" style={[styles.action, styles.clean]}><BrandBug kind="butterfly" size={21} /><Text style={[styles.actionText, { color: colors.cleanInk }]}>Clean</Text></Highlight>
                    : <View style={[styles.action, styles.clean, styles.resting]}><BrandBug kind="butterfly" size={21} /><Text style={[styles.actionText, { color: colors.cleanInk }]}>Clean</Text></View>}
                </View>
                {compact ? null : <View style={styles.meta}>
                  <View style={styles.severity}><View style={styles.severityDot} /><Text style={styles.severityText}>Low</Text></View>
                  <Text style={styles.metaText}>Reported 3 days ago</Text>
                </View>}
              </View>
            </Animated.View>
          </View>
        </>}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(30, 28, 44, 0.62)' },
  coachActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skip: { minWidth: 56, minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: colors.muted, fontSize: 15, fontWeight: '600' },

  ring: { position: 'absolute', top: -7, right: -7, bottom: -7, left: -7, borderWidth: 3, borderColor: colors.white },
  ringOnCard: { borderColor: colors.primary },
  guide: { position: 'absolute', top: -30, left: -14 },
  // On the card the bug sits on the button's top-right corner, clear of the "Pays" line.
  guideOnCard: { left: undefined, right: -14, top: -32 },

  coachDock: { position: 'absolute', left: 16, right: 16 },
  coach: { padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.primaryBorder, borderBottomWidth: 4, backgroundColor: colors.white, gap: 14 },
  coachTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  coachBug: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  coachCopy: { flex: 1, minWidth: 0, gap: 4 },
  coachTitle: { fontSize: 21, lineHeight: 25, fontFamily: fonts.heading },
  coachLine: { color: colors.body, fontSize: 16, lineHeight: 22 },
  coachBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lineStrong },
  dotOn: { width: 22, backgroundColor: colors.primary },
  next: { minHeight: 46, minWidth: 112 },

  // Same look as the map's Report Litter button (styles/MapScreen.styles.js).
  reportButton: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 25, borderWidth: 2, borderColor: colors.reportEdge, backgroundColor: colors.white },
  reportBugSpace: { width: 26 }, // the dragonfly has flown up to the corner as the guide
  reportText: { flexShrink: 1, color: colors.reportInk, fontSize: 16, fontFamily: fonts.heading },

  spot: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  spotPin: { marginBottom: 12 },
  spotPinLit: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 2 },
  // Same look as the map's floating card and its Fund / Clean buttons (components/MapReportPreview.jsx).
  card: { alignSelf: 'stretch', borderRadius: 20, borderWidth: 2, borderColor: colors.edge, backgroundColor: colors.white },
  photo: { overflow: 'hidden', borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: colors.mist },
  photoImage: { width: '100%', height: '100%' },
  badge: { position: 'absolute', left: 10, top: 10, height: 28, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, paddingRight: 12, borderRadius: 14, backgroundColor: colors.white },
  badgeText: { color: colors.needsCleanup, fontSize: 13, fontFamily: fonts.heading },
  example: { position: 'absolute', right: 10, top: 10, height: 28, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.white },
  exampleText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  cardBody: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  summary: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 18 },
  meta: { marginTop: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.mist, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  severity: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  severityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.severityLow },
  severityText: { color: colors.body, fontSize: 12, fontWeight: '700' },
  metaText: { color: colors.muted, fontSize: 12 },
  cardTitle: { color: colors.ink, fontSize: 16, lineHeight: 20.5, fontFamily: fonts.heading },
  pays: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  paysText: { color: colors.gold, fontSize: 16, lineHeight: 20, fontFamily: fonts.heading },
  actions: { marginTop: 34, flexDirection: 'row', gap: 16 }, // room for the guide bug above the lit button
  action: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderBottomWidth: 4 },
  fund: { borderColor: colors.fundEdge, backgroundColor: colors.fundFill },
  clean: { borderColor: colors.cleanEdge, backgroundColor: colors.cleanFill },
  resting: { opacity: 0.35 },
  actionText: { fontSize: 16, fontWeight: '800' },
});
