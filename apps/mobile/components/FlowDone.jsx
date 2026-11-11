import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

import BrandBug from './BrandBug';
import { colors, fonts } from '../lib/theme';

// The website's "workflow finish" banner (apps/web FlowDone): a bug, a short title and
// one line, shown over whatever screen the flow lands on. It replaces a system pop-up
// when there is nothing to decide. Call showFlowDone() from anywhere; <FlowDoneHost />
// is mounted once in App.js.
let present = null;

export function showFlowDone({ bug = 'flower', title, text = '' }) {
  if (!title) return;
  if (present) present({ bug, title, text, key: Date.now() });
  AccessibilityInfo.announceForAccessibility?.(text ? `${title}. ${text}` : title);
}

const EDGE = { dragonfly: colors.reportEdge, flower: colors.doneBorder, bee: colors.yellowBorder, caterpillar: colors.greenBorder };

export function FlowDoneHost() {
  // Mounted beside the navigator, outside its safe-area provider, so read the
  // device's insets directly.
  const topInset = initialWindowMetrics?.insets?.top ?? 44;
  const [message, setMessage] = useState(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    present = setMessage;
    return () => { if (present === setMessage) present = null; };
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    progress.setValue(0);
    Animated.spring(progress, { toValue: 1, damping: 20, stiffness: 220, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => { if (finished) setMessage(null); });
    }, 4200);
    return () => clearTimeout(timer);
  }, [message, progress]);

  if (!message) return null;
  return (
    <View style={[styles.host, { top: topInset + 10 }]} pointerEvents="box-none">
      <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] }}>
        <TouchableOpacity
          style={[styles.card, { borderColor: EDGE[message.bug] || colors.line }]}
          activeOpacity={0.9}
          onPress={() => setMessage(null)}
          accessibilityRole="alert"
          accessibilityLabel={message.text ? `${message.title}. ${message.text}` : message.title}
          accessibilityHint="Dismisses this message"
        >
          <BrandBug kind={message.bug} size={30} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{message.title}</Text>
            {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, zIndex: 9000, elevation: 9000 },
  card: {
    minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, borderWidth: 2, backgroundColor: colors.white,
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 10,
  },
  title: { color: colors.ink, fontSize: 16, lineHeight: 21, fontFamily: fonts.heading },
  text: { marginTop: 2, color: colors.body, fontSize: 14, lineHeight: 19 },
});
