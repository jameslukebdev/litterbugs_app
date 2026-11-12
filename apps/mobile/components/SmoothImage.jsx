import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Animated } from '../lib/safeAnimated';
import { prefersReducedMotion } from '../lib/reduceMotion';

const fill = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 };

// A photo that never blinks. A picture the phone already has appears at once; only one
// that had to be fetched fades in, over its placeholder colour. (A fixed fade on every
// appearance makes already-loaded photos flash each time a screen or card is shown.)
export default function SmoothImage({ style, onLoad, ...imageProps }) {
  const opacity = useRef(Animated?.Value ? new Animated.Value(0) : null).current;
  const mounted = useRef(Date.now());
  const shown = useRef(false);
  const reveal = (event) => {
    if (opacity && !shown.current) {
      shown.current = true;
      const cached = event?.cacheType && event.cacheType !== 'none';
      if (cached || Date.now() - mounted.current < 140 || prefersReducedMotion()) opacity.setValue(1);
      else Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
    onLoad?.(event);
  };
  if (!opacity) return <Image {...imageProps} style={style} onLoad={onLoad} />;
  return (
    <View style={[{ overflow: 'hidden' }, StyleSheet?.flatten ? StyleSheet.flatten(style) : style]}>
      <Animated.View style={[fill, { opacity }]}>
        <Image {...imageProps} transition={0} style={fill} onLoad={reveal} />
      </Animated.View>
    </View>
  );
}
