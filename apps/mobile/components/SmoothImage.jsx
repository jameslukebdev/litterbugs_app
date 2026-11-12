import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Animated } from '../lib/safeAnimated';
import { prefersReducedMotion } from '../lib/reduceMotion';
import { usePhotoBatchSlot } from './PhotoBatch';

const fill = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 };

// A photo that never blinks. A picture the phone already has appears at once; only one
// that had to be fetched fades in, over its placeholder colour. (A fixed fade on every
// appearance makes already-loaded photos flash each time a screen or card is shown.)
// Inside a photo batch, it waits and appears together with the screen's other photos.
export default function SmoothImage({ style, onLoad, onError, batchSlot, ...imageProps }) {
  const opacity = useRef(Animated?.Value ? new Animated.Value(0) : null).current;
  const mounted = useRef(Date.now());
  const shown = useRef(false);
  const ownSlot = usePhotoBatchSlot(!batchSlot && Boolean(opacity));
  const slot = batchSlot || ownSlot;
  useEffect(() => {
    if (!slot || !opacity) return undefined;
    return slot.listen((animate) => {
      if (shown.current) return;
      shown.current = true;
      if (!animate || prefersReducedMotion()) opacity.setValue(1);
      else Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  }, [slot, opacity]);
  const reveal = (event) => {
    if (slot) slot.settle(true);
    else if (opacity && !shown.current) {
      shown.current = true;
      const cached = event?.cacheType && event.cacheType !== 'none';
      if (cached || Date.now() - mounted.current < 140 || prefersReducedMotion()) opacity.setValue(1);
      else Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
    onLoad?.(event);
  };
  const failed = (event) => {
    slot?.settle(false);
    onError?.(event);
  };
  if (!opacity) return <Image {...imageProps} style={style} onLoad={onLoad} onError={onError} />;
  return (
    <View style={[{ overflow: 'hidden' }, StyleSheet?.flatten ? StyleSheet.flatten(style) : style]}>
      <Animated.View style={[fill, { opacity }]}>
        <Image {...imageProps} transition={0} style={fill} onLoad={reveal} onError={failed} />
      </Animated.View>
    </View>
  );
}
