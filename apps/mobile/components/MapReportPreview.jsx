import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
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
import { reportPresentation } from '../lib/reportPresentation';
import { reportStatePresentation } from '../lib/reportState';
import { colors, fonts } from '../lib/theme';

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
}) {
  const { height } = useWindowDimensions();
  const actions = [
    ...(canFund ? [{ text: 'Add funds', icon: 'wallet-outline', onPress: () => onFund(report) }] : []),
    ...(canShare ? [{ text: 'Share report', icon: 'share-outline', onPress: () => onShare(report) }] : []),
    { text: 'Close preview', icon: 'close-circle-outline', onPress: onClose },
  ];

  return <Animated.View
    style={[
      styles.card,
      report.cleanup_state === 'completed' && styles.completedCard,
      {
        bottom,
        opacity: animation,
        transform: [
          { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale: animation.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
        ],
      },
    ]}
  >
    <ScrollView
      style={{ maxHeight: Math.min(height * 0.55, Math.max(160, height - bottom - 112)) }}
      bounces={false}
      nestedScrollEnabled
    >
      <ReportPreviewHero
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
      />
    </ScrollView>
  </Animated.View>;
}

export default function MapReportPreview({
  report,
  nearby,
  bottom,
  insetBottom,
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
  isFavorite = false,
  onFavorite,
  favoritesReady = false,
}) {
  const { fontScale } = useWindowDimensions();
  const animation = useRef(new Animated.Value(report ? 1 : 0)).current;
  const [displayedReport, setDisplayedReport] = useState(report ?? null);

  useEffect(() => {
    animation.stopAnimation();

    if (report) {
      setDisplayedReport(report);
      animation.setValue(0);
      Animated.timing(animation, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(animation, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDisplayedReport(null);
    });
  }, [animation, report?.id]);

  useEffect(() => {
    if (report && displayedReport?.id === report.id && displayedReport !== report) {
      setDisplayedReport(report);
    }
  }, [displayedReport, report]);

  return <>
    {displayedReport ? <FloatingCard
      key={displayedReport.id}
      report={displayedReport}
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
      }}
    /> : null}
    <Modal visible={Boolean(nearby?.length)} transparent animationType="slide" onRequestClose={onCloseNearby}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} accessible={false} onPress={onCloseNearby} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insetBottom, 16), maxHeight: fontScale > 1.5 ? '90%' : '65%' }]}>
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
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  // Website floating map card (.map-pin-card): white, lilac edge, soft purple shadow.
  card: { position: 'absolute', left: 16, right: 16, borderRadius: 20, backgroundColor: colors.white, borderWidth: 2, borderColor: '#ECE8F8', boxShadow: '0 4px 0 #EBE7F8, 0 16px 32px rgba(42, 34, 90, 0.12)', elevation: 9 },
  completedCard: {},
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
