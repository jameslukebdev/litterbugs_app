import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ReportCardDetails from './ReportCardDetails';
import ReportCardMenu from './ReportCardMenu';
import Photo from './ReportPreviewPhoto';
import ReportPreviewHero from './ReportPreviewHero';
import BrandBug from './BrandBug';
import SlideUp from './SlideUp';
import { reportPresentation } from '../lib/reportPresentation';
import { reportStatePresentation } from '../lib/reportState';
import { hapticTap } from '../lib/haptics';
import { colors, fonts } from '../lib/theme';

const CARD_HEADER_HEIGHT = 36;

function Summary({ report }) {
  const presentation = reportPresentation(report);
  const state = reportStatePresentation(report);
  const completed = report.cleanup_state === 'completed';
  return <View style={styles.copy}>
    <Text style={styles.title} numberOfLines={2}>{report.title || 'Litter report'}</Text>
    <View style={styles.stateRow}>
      {state.bug ? <BrandBug kind={state.bug} size={15} /> : null}
      <Text style={[styles.status, { color: state.ink }]}>{state.label}</Text>
    </View>
    {!completed ? <Text style={styles.reward}>{presentation.funding}</Text> : null}
  </View>;
}

function FloatingCard({
  report,
  bottom,
  getPhotoUrl,
  onClose,
  onDetails,
  distance,
  onFund,
  onShare,
  canFund,
  canShare,
  isFavorite,
  onFavorite,
  favoritesReady,
  animation,
  canClean,
  cleanBusy,
  onClean,
  insetTop = 0,
  isOpen,
  reduceMotion,
  onExited,
}) {
  const { height } = useWindowDimensions();
  const dragY = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);
  const androidOffset = useRef(new Animated.Value(height)).current;
  const [androidCardHeight, setAndroidCardHeight] = useState(0);
  const androidEntered = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'android' || !androidCardHeight || reduceMotion === null) return undefined;
    // Wait for the native card to be laid out. Moving a full screen's height
    // spends much of the transition off screen, making the visible part snap.
    const offscreen = androidCardHeight + bottom + 24; // include the bottom shadow
    if (isOpen && !androidEntered.current) {
      androidOffset.setValue(offscreen);
      androidEntered.current = true;
    }
    const movement = Animated.timing(androidOffset, {
      toValue: isOpen ? 0 : offscreen,
      duration: reduceMotion ? 0 : isOpen ? 360 : 280,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    movement.start(({ finished }) => { if (finished && !isOpen) onExited?.(report.id); });
    return () => movement.stop();
  }, [androidCardHeight, androidOffset, bottom, isOpen, onExited, reduceMotion, report.id]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const maxHeight = Math.max(160, height - bottom - insetTop - 74);
  useEffect(() => {
    if (isOpen) dragY.setValue(0);
    return () => dragY.stopAnimation();
  }, [dragY, isOpen]);
  const pan = useMemo(() => {
    const reset = () => {
      if (reduceMotion) dragY.setValue(0);
      else Animated.spring(dragY, { toValue: 0, damping: 28, stiffness: 320, useNativeDriver: true }).start();
    };
    return PanResponder.create({
      // Let upward swipes and scrolled content keep their normal scrolling.
      // Only a downward pull from the top takes over to dismiss the card.
      onMoveShouldSetPanResponderCapture: (_, gesture) => scrollOffset.current <= 0
        && gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx) * 1.3,
      onPanResponderGrant: () => dragY.stopAnimation(),
      onPanResponderMove: (_, gesture) => dragY.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 || (gesture.dy > 20 && gesture.vy > 0.75)) closeRef.current?.();
        else reset();
      },
      onPanResponderTerminate: reset,
    });
  }, [dragY, reduceMotion]);
  const actions = [
    ...(canShare ? [{ text: 'Share report', icon: 'share-outline', onPress: () => onShare(report) }] : []),
    { text: 'Close preview', icon: 'close-circle-outline', onPress: onClose },
  ];

  return <Animated.View
    {...pan.panHandlers}
    onLayout={Platform.OS === 'android' ? (event) => {
      const measured = event.nativeEvent.layout.height;
      if (measured > 0) setAndroidCardHeight(current => current || measured);
    } : undefined}
    renderHardwareTextureAndroid={Platform.OS === 'android'}
    pointerEvents={isOpen ? 'auto' : 'none'}
    onAccessibilityEscape={onClose}
    style={[
      styles.card,
      report.cleanup_state === 'completed' && styles.completedCard,
      {
        bottom,
        maxHeight,
        transform: [
          { translateY: Animated.add(Platform.OS === 'android' ? androidOffset : animation.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }), dragY) },
        ],
      },
    ]}
  >
    <View style={styles.cardHeader}>
      <View style={styles.grabber} pointerEvents="none" />
    </View>
    <TouchableOpacity style={styles.cardClose} onPress={onClose} accessibilityRole="button" accessibilityLabel="Back to map" accessibilityHint="Closes the report preview. You can also swipe the card down.">
      <Ionicons name="close" size={18} color={colors.body} />
    </TouchableOpacity>
    <ScrollView
      // Keep the close control outside the scroll area, even on short phones.
      style={{ maxHeight: maxHeight - CARD_HEADER_HEIGHT }}
      bounces={false}
      nestedScrollEnabled
      onScroll={(event) => { scrollOffset.current = Math.max(0, event.nativeEvent.contentOffset.y); }}
      scrollEventThrottle={16}
    >
      <ReportPreviewHero
        sheet
        report={report}
        getPhotoUrl={getPhotoUrl}
        onPress={onDetails}
        isFavorite={isFavorite}
        onFavorite={onFavorite}
        favoritesReady={favoritesReady}
      />
      <ReportCardDetails
        preview
        report={report}
        distance={distance}
        onPress={onDetails}
        options={<ReportCardMenu actions={actions} />}
        actions={canFund || canClean ? (
          // The report page's own actions (ReportDetailsSheet footer): Fund (bee, yellow) then Clean (butterfly, lilac).
          <View style={styles.actionRow}>
            {canFund ? (
              <TouchableOpacity style={[styles.actionButton, styles.fundButton]} onPress={() => { hapticTap(); onFund(report); }} accessibilityRole="button" accessibilityLabel="Fund cleanup">
                <BrandBug kind="bee" size={21} />
                <Text style={[styles.actionText, { color: colors.fundInk }]}>Fund</Text>
              </TouchableOpacity>
            ) : null}
            {canClean ? (
              <TouchableOpacity style={[styles.actionButton, styles.cleanButton]} onPress={() => { hapticTap(); onClean(report); }} disabled={cleanBusy} accessibilityRole="button" accessibilityLabel="Clean up this report" accessibilityState={{ busy: Boolean(cleanBusy), disabled: Boolean(cleanBusy) }}>
                <BrandBug kind="butterfly" size={21} />
                <Text style={[styles.actionText, { color: colors.cleanInk }]}>Clean</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      />
    </ScrollView>
  </Animated.View>;
}

export default function MapReportPreview({
  report,
  nearby,
  bottom = 0,
  insetBottom,
  insetTop = 0,
  getPhotoUrl,
  onClose,
  onChoose,
  onDetails,
  onCloseNearby,
  distance,
  onFund,
  onShare,
  canFund = false,
  canShare = false,
  canClean = false,
  cleanBusy = false,
  onClean,
  isFavorite = false,
  onFavorite,
  favoritesReady = false,
}) {
  const { fontScale } = useWindowDimensions();
  const animation = useRef(new Animated.Value(0)).current;
  const [displayedReport, setDisplayedReport] = useState(report ?? null);
  const [reduceMotion, setReduceMotion] = useState(null);
  const reportRef = useRef(report);
  reportRef.current = report;
  const finishAndroidExit = useCallback((id) => {
    // A dismissed card must not clear a new selection made during its exit.
    if (!reportRef.current) setDisplayedReport(current => current?.id === id ? null : current);
  }, []);

  useEffect(() => {
    let active = true;
    const update = (value) => { if (active) setReduceMotion(Boolean(value)); };
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.() ?? false).then(update).catch(() => update(false));
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', update);
    return () => { active = false; subscription?.remove(); };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      if (report) setDisplayedReport(report);
      return undefined; // The laid-out native card owns Android entry and exit.
    }
    animation.stopAnimation();
    if (reduceMotion === null) return;

    if (report) {
      setDisplayedReport(report);
      animation.setValue(0);
      Animated.timing(animation, {
        toValue: 1,
        duration: reduceMotion ? 0 : 240,
        useNativeDriver: true,
      }).start();
      return () => animation.stopAnimation();
    }

    Animated.timing(animation, {
      toValue: 0,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDisplayedReport(null);
    });
    return () => animation.stopAnimation();
  }, [animation, report?.id, reduceMotion]);

  useEffect(() => {
    if (report && displayedReport?.id === report.id && displayedReport !== report) {
      setDisplayedReport(report);
    }
  }, [displayedReport, report]);

  return <>
    {displayedReport ? <FloatingCard
      key={displayedReport.id}
      report={displayedReport}
      isOpen={Boolean(report)}
      reduceMotion={reduceMotion}
      onExited={finishAndroidExit}
      {...{
        bottom,
        getPhotoUrl,
        onClose,
        onDetails,
        distance,
        onFund,
        onShare,
        canFund,
        canShare,
        isFavorite,
        onFavorite,
        favoritesReady,
        animation,
        canClean,
        cleanBusy,
        onClean,
        insetTop,
      }}
    /> : null}
    <Modal visible={Boolean(nearby?.length)} transparent animationType="fade" onRequestClose={onCloseNearby}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} accessible={false} onPress={onCloseNearby} />
        <SlideUp style={[styles.sheet, { paddingBottom: Math.max(insetBottom, 16), maxHeight: fontScale > 1.5 ? '90%' : '65%' }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.heading} accessibilityRole="header">Reports here</Text>
            <TouchableOpacity style={styles.close} accessibilityRole="button" accessibilityLabel="Close nearby reports" onPress={onCloseNearby}>
              <Ionicons name="close" size={22} color={colors.body} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={nearby || []}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={item.title || 'Preview report'}
              style={styles.result}
              onPress={() => onChoose(item)}
            >
              <Photo report={item} getPhotoUrl={getPhotoUrl} />
              <Summary report={item} />
              <Ionicons name="chevron-forward" size={18} color={colors.body} />
            </TouchableOpacity>}
          />
        </SlideUp>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  // Website floating map card (.map-pin-card): white, lilac edge, soft purple shadow.
  card: { position: 'absolute', left: 16, right: 16, borderRadius: 20, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.edge, boxShadow: '0 4px 0 #EBE7F8, 0 16px 32px rgba(42, 34, 90, 0.12)', elevation: 9 },
  completedCard: {},
  cardHeader: { height: CARD_HEADER_HEIGHT, flexShrink: 0, alignItems: 'center', paddingTop: 10 },
  grabber: { width: 36, height: 3, borderRadius: 2, backgroundColor: '#B9B5C4' },
  // The visual button is compact; its full touch target stays fixed above scrolled content.
  cardClose: { position: 'absolute', zIndex: 2, right: 2, top: 0, width: 44, height: 44, paddingBottom: 44 - CARD_HEADER_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  // Same buttons as the report page footer (styles/MapScreen.styles.js reportActionButton).
  actionRow: { marginTop: 10, flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderBottomWidth: 4 },
  fundButton: { borderColor: colors.fundEdge, backgroundColor: colors.fundFill },
  cleanButton: { borderColor: colors.cleanEdge, backgroundColor: colors.cleanFill },
  actionText: { fontSize: 16, fontWeight: '800' },
  copy: { flex: 1, gap: 5 },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  status: { fontSize: 13, fontWeight: '800' },
  reward: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { maxHeight: '65%', backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { flex: 1, fontSize: 22, fontFamily: fonts.heading, color: colors.ink },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
