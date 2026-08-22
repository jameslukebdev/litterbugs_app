import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import ReportList from './ReportList';

export function getMapReportSheetMetrics(screenHeight, bottomClearance = 0) {
  const sheetHeight = Math.min(560, Math.max(480, screenHeight * 0.58));
  const collapsedVisibleHeight = Math.min(
    188,
    Math.max(132, bottomClearance + 44)
  );

  return {
    sheetHeight,
    collapsedVisibleHeight,
    collapsedOffset: Math.max(0, sheetHeight - collapsedVisibleHeight),
  };
}

export default function MapReportSheet({
  reports,
  origin,
  onReportPress,
  bottomClearance,
  refreshing,
  onRefresh,
  onExpandedChange,
}) {
  const { height } = useWindowDimensions();
  const metrics = useMemo(
    () => getMapReportSheetMetrics(height, bottomClearance),
    [bottomClearance, height]
  );
  const translateY = useRef(new Animated.Value(metrics.collapsedOffset)).current;
  const currentTranslate = useRef(metrics.collapsedOffset);
  const expanded = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dragStart = useRef(metrics.collapsedOffset);

  useEffect(() => {
    const listener = translateY.addListener(({ value }) => {
      currentTranslate.current = value;
    });

    return () => translateY.removeListener(listener);
  }, [translateY]);

  useEffect(() => {
    const target = expanded.current ? 0 : metrics.collapsedOffset;
    translateY.setValue(target);
    currentTranslate.current = target;
  }, [metrics.collapsedOffset, translateY]);

  const animateTo = (nextExpanded) => {
    expanded.current = nextExpanded;
    setIsExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);

    Animated.spring(translateY, {
      toValue: nextExpanded ? 0 : metrics.collapsedOffset,
      damping: 24,
      stiffness: 230,
      mass: 0.85,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => {
      translateY.stopAnimation();
      dragStart.current = currentTranslate.current;
    },
    onPanResponderMove: (_, gesture) => {
      const nextValue = Math.max(
        0,
        Math.min(metrics.collapsedOffset, dragStart.current + gesture.dy)
      );
      translateY.setValue(nextValue);
    },
    onPanResponderRelease: (_, gesture) => {
      const isTap = Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6;
      if (isTap) {
        animateTo(!expanded.current);
        return;
      }

      const shouldExpand = gesture.vy <= -0.35
        ? true
        : gesture.vy >= 0.35
          ? false
          : currentTranslate.current < metrics.collapsedOffset * 0.5;
      animateTo(shouldExpand);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => {
      animateTo(expanded.current);
    },
  }), [metrics.collapsedOffset, translateY]);

  const reportCount = reports?.length ?? 0;
  const listOpacity = translateY.interpolate({
    inputRange: [0, Math.max(1, metrics.collapsedOffset * 0.55), metrics.collapsedOffset],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: metrics.sheetHeight,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={styles.dragArea}
        accessible
        accessibilityRole="button"
        accessibilityLabel={expanded.current ? 'Collapse report list' : 'Expand report list'}
        accessibilityHint="Swipe up to show reports or swipe down to return to the map"
        onAccessibilityTap={() => animateTo(!expanded.current)}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />
        <Text style={styles.heading} accessibilityRole="header" accessibilityLiveRegion="polite">
          {reportCount} {reportCount === 1 ? 'report' : 'reports'} nearby
        </Text>
      </View>

      <Animated.View
        style={[styles.listContainer, { opacity: listOpacity }]}
        accessibilityElementsHidden={!isExpanded}
        importantForAccessibility={isExpanded ? 'auto' : 'no-hide-descendants'}
      >
        <ReportList
          reports={reports}
          origin={origin}
          onReportPress={onReportPress}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: bottomClearance + 20 }}
          style={styles.list}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },
  dragArea: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingTop: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9CDD0',
  },
  heading: {
    marginTop: 8,
    color: '#111417',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E3E5',
  },
});
