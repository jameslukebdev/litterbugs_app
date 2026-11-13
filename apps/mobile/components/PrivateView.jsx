import { View } from 'react-native';

// Hides its contents from session replay (drawn as a solid block), the same way as
// posthog-react-native's PostHogMaskView, without loading the analytics SDK in builds
// where analytics is off. Screen readers still read everything inside: the label is
// only on this wrapper, which is itself kept out of the accessibility tree.
// collapsable={false} keeps the wrapper in the native view tree so the mask is found.
export default function PrivateView({ children, ...props }) {
  return (
    <View {...props} accessibilityLabel="ph-no-capture" importantForAccessibility="no" collapsable={false}>
      {children}
    </View>
  );
}
