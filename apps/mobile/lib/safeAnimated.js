import * as ReactNative from 'react-native';

// React Native's Animated and AccessibilityInfo, or null where a stand-in for
// react-native does not provide them (unit tests). Callers treat null as "stay still".
function pick(name) {
  try { return ReactNative[name] ?? null; } catch { return null; }
}

export const Animated = pick('Animated');
export const AccessibilityInfo = pick('AccessibilityInfo');
