import { useEffect, useRef, useState } from 'react';
import { Easing, Text, View } from 'react-native';
import BrandBug from './BrandBug';
import { Animated } from '../lib/safeAnimated';
import { prefersReducedMotion } from '../lib/reduceMotion';
import { formatUsd } from '../lib/funding';

// The website's fund flight (apps/web components/bug-motion.tsx, useFundFlight): when a
// report's cleanup fund grows while you watch, or you come back from paying into it, a bee
// flies up from the Fund button to the amount, which then counts up and pops.
const before = new Map();

/** Call when the member sets off to add money, so the return trip can animate. */
export function rememberFundBefore(reportId, cents) {
  if (reportId) before.set(String(reportId), Number(cents) || 0);
}

export default function FundAmount({ reportId, cents, rowStyle, textStyle, suffix = ' in its cleanup fund' }) {
  const [shown, setShown] = useState(cents);
  const [flying, setFlying] = useState(false);
  const flight = useRef(Animated?.Value ? new Animated.Value(1) : null).current;
  const pop = useRef(Animated?.Value ? new Animated.Value(0) : null).current;
  const last = useRef(null);

  useEffect(() => {
    const key = String(reportId);
    const previous = last.current;
    last.current = { key, cents };
    const saved = before.get(key);
    const from = previous && previous.key === key && cents > previous.cents ? previous.cents
      : saved != null && cents > saved ? saved : null;
    before.delete(key);
    if (from == null || !flight || prefersReducedMotion()) { setShown(cents); return undefined; }

    setShown(from);
    setFlying(true);
    flight.setValue(0);
    let frame = 0;
    const countUp = () => {
      setFlying(false);
      pop.setValue(0);
      Animated.timing(pop, { toValue: 1, duration: 380, useNativeDriver: true }).start();
      const started = Date.now();
      const step = () => {
        const t = Math.min(1, (Date.now() - started) / 550);
        setShown(Math.round(from + (cents - from) * (1 - (1 - t) ** 3)));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const animation = Animated.timing(flight, { toValue: 1, duration: 750, delay: 350, easing: Easing?.inOut?.(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) countUp(); });
    return () => { animation.stop(); cancelAnimationFrame(frame); };
  }, [reportId, cents, flight, pop]);

  const amount = <Text style={textStyle}>{formatUsd(shown)}{suffix}</Text>;
  return (
    <View style={rowStyle}>
      <BrandBug kind="bee" size={18} />
      {pop ? <Animated.View style={{ flexShrink: 1, transform: [{ scale: pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] }) }] }}>{amount}</Animated.View> : amount}
      {flying && flight ? (
        // The bee on its way up from the Fund button at the bottom of the sheet.
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity: flight.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }), transform: [
          { translateX: flight.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
          { translateY: flight.interpolate({ inputRange: [0, 1], outputRange: [460, 0] }) },
        ] }}>
          <BrandBug kind="bee" size={22} loop />
        </Animated.View>
      ) : null}
    </View>
  );
}
