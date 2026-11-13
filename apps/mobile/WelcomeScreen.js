import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BrandBug from './components/BrandBug';
import MapPin from './components/MapPin';
import { PrimaryButton, TextLink } from './components/ui';
import { trackFirstRun } from './lib/analytics';
import { markWelcomeSeen } from './lib/discoveryMemory';
import { FIRST_RUN_START, START_PATHS, setFirstRunStage } from './lib/firstRun';
import { prefersReducedMotion } from './lib/reduceMotion';
import { colors, fonts } from './lib/theme';

// First launch. One spot goes through the three things you can do, in order: a dragonfly
// reports it (a ladybug pin lands), a bee funds it (the pin counts up), a butterfly cleans
// it (the pin becomes the flower and the fund moves to the cleaner). The headline names
// all three at once, so it reads even if nobody waits for the story.
const STEP_MS = 3800;
const FUND_STEPS = [2, 4, 6];

// A calm drawn map in the app's own map greens, so the pin is the only thing to watch.
function MapArt({ width, height }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.hill, { width: width * 1.5, height: height * 0.5, top: -height * 0.3, left: -width * 0.2 }]} />
      <View style={[styles.hill, { width: width * 1.5, height: height * 0.5, top: height * 0.84, left: -width * 0.3 }]} />
      <View style={[styles.town, { width: width * 0.8, height: height * 0.36, top: height * 0.38, left: width * 0.1 }]} />
      <View style={[styles.field, { width: width * 0.22, height: height * 0.17, top: height * 0.14, left: width * 0.64 }]} />
      <View style={[styles.creek, { width: width * 0.72, top: height * 0.29, left: -width * 0.04 }]} />
      <View style={[styles.road, { width: 9, height: height * 0.66, top: -height * 0.05, left: width * 0.3, transform: [{ rotate: '4deg' }] }]} />
      <View style={[styles.road, { width: 9, height: height * 0.56, top: height * 0.575, left: width * 0.6, transform: [{ rotate: '-16deg' }] }]} />
      <View style={[styles.road, { width: width * 1.2, height: 11, top: height * 0.585, left: -width * 0.1, transform: [{ rotate: '-7deg' }] }]} />
    </View>
  );
}

function Story({ step, loop }) {
  const [size, setSize] = useState(null);
  const [fund, setFund] = useState(0);
  const [cleaned, setCleaned] = useState(false);
  const v = useRef({
    pin: new Animated.Value(0), pop: new Animated.Value(1), photo: new Animated.Value(0), reporter: new Animated.Value(0),
    funder: new Animated.Value(0), coins: FUND_STEPS.map(() => new Animated.Value(0)),
    cleaner: new Animated.Value(0), earned: new Animated.Value(0), pill: new Animated.Value(0),
  }).current;

  useEffect(() => {
    const still = prefersReducedMotion();
    const timers = [];
    const later = (ms, action) => timers.push(setTimeout(action, ms));
    const to = (value, config = {}) => Animated.timing(value, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true, ...config });
    const pop = () => { v.pop.setValue(0.7); Animated.spring(v.pop, { toValue: 1, damping: 9, stiffness: 260, useNativeDriver: true }).start(); };
    const all = [v.pin, v.pop, v.photo, v.reporter, v.funder, ...v.coins, v.cleaner, v.earned, v.pill];
    all.forEach(value => value.stopAnimation());
    // Every step starts from the state the one before it left behind.
    v.pin.setValue(step === 0 ? 0 : 1); v.photo.setValue(step === 0 ? 0 : 1); v.pop.setValue(1);
    [v.reporter, v.funder, ...v.coins, v.cleaner, v.earned, v.pill].forEach(value => value.setValue(0));
    setFund(step === 2 ? 6 : 0);
    setCleaned(false);
    let running = null;

    if (still) {
      v.pin.setValue(1); v.photo.setValue(1);
      [v.reporter, v.funder, v.cleaner].forEach((value, index) => value.setValue(index === step ? 1 : 0));
      if (step === 1) setFund(6);
      if (step === 2) { setCleaned(true); v.earned.setValue(1); v.pill.setValue(1); }
    } else if (step === 0) {
      running = Animated.parallel([
        to(v.photo, { duration: 450 }), to(v.reporter, { duration: 600 }),
        Animated.spring(v.pin, { toValue: 1, delay: 550, damping: 11, stiffness: 170, useNativeDriver: true }),
      ]);
    } else if (step === 1) {
      running = Animated.parallel([
        to(v.funder),
        ...v.coins.map((coin, index) => to(coin, { delay: 500 + index * 500, duration: 720, easing: Easing.in(Easing.quad) })),
      ]);
      FUND_STEPS.forEach((amount, index) => later(1170 + index * 500, () => { setFund(amount); pop(); }));
    } else {
      running = Animated.parallel([
        to(v.cleaner, { duration: 750 }),
        to(v.earned, { delay: 900, duration: 650, easing: Easing.out(Easing.back(1.3)) }),
        to(v.pill, { delay: 1150, duration: 400, easing: Easing.out(Easing.back(1.8)) }),
      ]);
      later(750, () => { setCleaned(true); setFund(0); pop(); });
    }
    running?.start();
    return () => { running?.stop(); timers.forEach(clearTimeout); };
  }, [step, loop, v]);

  const w = size?.width ?? 0;
  const h = size?.height ?? 0;
  const spot = { x: w * 0.5, y: h * 0.56 }; // where the pin's tail points
  const mix = (value, from, to) => value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <View style={styles.scene} onLayout={event => setSize(event.nativeEvent.layout)} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {size ? <>
        <MapArt width={w} height={h} />

        {/* The report: a snapshot of the spot, with the reporter's dragonfly on its corner. */}
        <Animated.View style={[styles.photo, { opacity: v.photo, transform: [{ scale: mix(v.photo, 1.2, 1) }, { rotate: '-5deg' }] }]}>
          <Image source={require('./assets/tour-example-spot.jpg')} style={styles.photoShot} resizeMode="cover" accessible={false} />
          <Animated.View style={[styles.photoDone, { opacity: v.pill, transform: [{ scale: mix(v.pill, 0.6, 1) }] }]}>
            <BrandBug kind="flower" size={15} /><Text style={styles.photoDoneText} allowFontScaling={false}>Cleaned up</Text>
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.reporter, { opacity: v.reporter, transform: [{ translateX: mix(v.reporter, 60, 0) }, { translateY: mix(v.reporter, -50, 0) }, { rotate: '14deg' }] }]}>
          <BrandBug kind="dragonfly" size={52} active={step === 0} />
        </Animated.View>

        {/* The spot's pin, drawn by the same component as the real map. */}
        <Animated.View style={[styles.pinStage, { top: spot.y - 120, opacity: v.pin, transform: [{ translateY: mix(v.pin, -70, 0) }] }]}>
          <Animated.View style={{ transformOrigin: 'bottom', transform: [{ scale: Animated.multiply(v.pop, 1.7) }] }}>
            <MapPin key={`${cleaned ? 'done' : 'open'}-${fund}`} kind={cleaned ? 'done' : 'open'} text={fund > 0 ? `$${fund}` : null} />
          </Animated.View>
        </Animated.View>

        {/* The fund: a bee drops contributions onto the pin. */}
        <Animated.View style={[styles.funder, { opacity: v.funder, transform: [{ translateX: mix(v.funder, 60, 0) }, { translateY: mix(v.funder, -20, 0) }] }]}>
          <BrandBug kind="bee" size={50} loop={step === 1} />
        </Animated.View>
        {v.coins.map((coin, index) => (
          <Animated.View key={index} style={[styles.chip, styles.coin, {
            opacity: coin.interpolate({ inputRange: [0, 0.25, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateX: mix(coin, 0, spot.x - (w - 80)) }, { translateY: mix(coin, 0, spot.y - 60 - 76) }, { scale: mix(coin, 0.7, 0.9) }],
          }]}>
            <Text style={styles.chipText} allowFontScaling={false}>+$2</Text>
          </Animated.View>
        ))}

        {/* The cleanup: a butterfly cleans the spot and the fund moves to it. */}
        <Animated.View style={[styles.cleaner, { opacity: v.cleaner, transform: [{ translateX: mix(v.cleaner, 80, 0) }, { translateY: mix(v.cleaner, -40, 0) }] }]}>
          <BrandBug kind="butterfly" size={54} active={cleaned} />
        </Animated.View>
        <Animated.View style={[styles.chip, styles.earned, {
          opacity: v.earned.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: [{ translateX: mix(v.earned, spot.x - (w - 52), 0) }, { translateY: mix(v.earned, spot.y - 60 - (h - 104), 0) }, { scale: mix(v.earned, 0.6, 1) }],
        }]}>
          <Text style={[styles.chipText, styles.earnedText]} allowFontScaling={false}>+$6</Text>
        </Animated.View>
      </> : null}
    </View>
  );
}

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [loop, setLoop] = useState(0);

  const showStep = (next) => { if (next === 0) setLoop(count => count + 1); setStep(next); };
  // The story plays by itself; tapping a line restarts the wait from that step.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const next = setTimeout(() => showStep((step + 1) % START_PATHS.length), STEP_MS);
    return () => clearTimeout(next);
  }, [step, loop]);

  useEffect(() => { trackFirstRun('welcome_shown'); }, []);
  const leave = async (open, choice) => {
    trackFirstRun(choice);
    await markWelcomeSeen();
    setFirstRunStage(FIRST_RUN_START);
    open();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
      <StatusBar hidden={false} style="dark" backgroundColor={colors.white} />
      <Image source={require('./assets/LB_Logo_PNG.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Litterbugs" />
      <View style={styles.verbs} accessibilityRole="header">
        {START_PATHS.map((path, index) => {
          const on = index === step;
          return (
            <TouchableOpacity key={path.key} style={styles.verb} activeOpacity={0.7} onPress={() => showStep(index)} accessibilityRole="button" accessibilityLabel={`${path.verb} ${path.caption}`} accessibilityState={{ selected: on }}>
              <BrandBug kind={path.bug} size={34} active={on} style={!on && styles.verbBugIdle} />
              <Text style={[styles.verbText, on && { color: path.verbInk }]} maxFontSizeMultiplier={1.15} numberOfLines={1} adjustsFontSizeToFit>{path.verb}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Story step={step} loop={loop} />
      <Text style={styles.caption} maxFontSizeMultiplier={1.3} accessibilityLiveRegion="polite">{START_PATHS[step].caption}</Text>
      {/* Capped like the caption so both choices stay on screen at the largest text sizes (the screen does not scroll). */}
      <PrimaryButton label="Get started" style={styles.start} maxFontSizeMultiplier={1.5} onPress={() => leave(() => (navigation.canGoBack() ? navigation.popTo('App', { screen: 'Map' }) : navigation.replace('App', { screen: 'Map' })), 'welcome_get_started')} />
      <TextLink tone="muted" label="Sign in or create account" style={styles.signIn} maxFontSizeMultiplier={1.5} onPress={() => leave(() => navigation.navigate('Auth'), 'welcome_sign_in')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, backgroundColor: colors.white },
  logo: { width: 104, height: 71, marginLeft: -6 },
  verbs: { marginTop: 8, marginBottom: 14, alignItems: 'flex-start' },
  verb: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  verbBugIdle: { opacity: 0.4 },
  verbText: { flexShrink: 1, color: colors.subtle, fontSize: 37, lineHeight: 44, letterSpacing: -0.4, fontFamily: fonts.heading },

  scene: { flex: 1, minHeight: 190, overflow: 'hidden', borderRadius: 30, borderWidth: 1.5, borderBottomWidth: 5, borderColor: '#D5E3CD', backgroundColor: '#D7E9CF' },
  hill: { position: 'absolute', borderRadius: 400, backgroundColor: '#E3F0DB' },
  town: { position: 'absolute', borderRadius: 400, backgroundColor: '#F5F3E9' },
  field: { position: 'absolute', borderRadius: 400, backgroundColor: '#EEF2E2' },
  creek: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: '#BBDCEF', transform: [{ rotate: '4deg' }] },
  road: { position: 'absolute', borderRadius: 6, borderWidth: 1.5, borderColor: '#E4E0D2', backgroundColor: colors.white },

  pinStage: { position: 'absolute', left: 0, right: 0, height: 120, alignItems: 'center', justifyContent: 'flex-end' },
  photo: { position: 'absolute', left: 16, bottom: 16, width: 122, padding: 5, paddingBottom: 12, borderRadius: 12, backgroundColor: colors.white, boxShadow: '0 8px 18px rgba(46, 37, 128, 0.22)', elevation: 5 },
  photoShot: { width: '100%', height: 78, borderRadius: 8, backgroundColor: colors.mist },
  photoDone: { position: 'absolute', alignSelf: 'center', top: 30, height: 28, flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 7, paddingRight: 11, borderRadius: 14, borderWidth: 1.5, borderColor: '#8ED7C5', backgroundColor: '#B9E9DD' },
  photoDoneText: { color: '#14503F', fontSize: 13, fontFamily: fonts.heading },
  reporter: { position: 'absolute', left: 108, bottom: 86 },
  funder: { position: 'absolute', right: 22, top: 22 },
  cleaner: { position: 'absolute', right: 26, bottom: 26 },
  chip: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1.5, borderColor: colors.fundEdge, backgroundColor: colors.fundFill },
  coin: { right: 56, top: 62, height: 28, paddingHorizontal: 10 },
  earned: { right: 24, bottom: 88, height: 32, paddingHorizontal: 12 },
  chipText: { color: colors.fundInk, fontSize: 14, fontFamily: fonts.heading },
  earnedText: { fontSize: 17 },

  caption: { minHeight: 44, marginTop: 14, marginHorizontal: 4, color: colors.body, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  start: { marginTop: 12, minHeight: 58, borderRadius: 20 },
  signIn: { marginTop: 4 },
});
