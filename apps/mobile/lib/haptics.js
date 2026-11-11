// Light touch feedback for taps that change something and for moments worth
// marking (a payment received, a cleanup sent, a new rank). Every call is
// best-effort: an app build without the native module, a device without a
// haptic engine, or a person who has turned system haptics off all do nothing.
let nativeHaptics;

function loadHaptics() {
  if (nativeHaptics !== undefined) return nativeHaptics;
  try {
    nativeHaptics = require('expo-haptics');
  } catch {
    nativeHaptics = null;
  }
  return nativeHaptics;
}

function run(play) {
  try {
    const haptics = loadHaptics();
    if (!haptics) return;
    const result = play(haptics);
    if (result?.catch) result.catch(() => {});
  } catch {
    // Feedback is never worth an error.
  }
}

// Switching a tab, filter or other choice.
export const hapticSelect = () => run((haptics) => haptics.selectionAsync());

// Pressing a main action button or toggling a favourite.
export const hapticTap = () => run((haptics) => haptics.impactAsync(haptics.ImpactFeedbackStyle.Light));

// Something finished well: payment received, cleanup sent, rank earned.
export const hapticSuccess = () => run((haptics) => haptics.notificationAsync(haptics.NotificationFeedbackType.Success));
