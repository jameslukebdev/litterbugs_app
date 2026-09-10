import ReportCardDetails from './ReportCardDetails';
import ReportCardMenu from './ReportCardMenu';
import { useRef, useState } from 'react';
import RemotePhoto from './RemotePhoto';
import Photo from './ReportPreviewPhoto';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportPresentation } from '../lib/reportPresentation';

function Summary({ report }) {
  const presentation = reportPresentation(report);
  const completed = report.cleanup_state === 'completed';
  return <View style={styles.copy}>
    <Text style={styles.title} numberOfLines={2}>{report.title || 'Litter report'}</Text>
    <Text style={styles.status}>{presentation.status}</Text>
    {!completed ? <Text style={styles.reward}>{presentation.funding}</Text> : null}
  </View>;
}
function FloatingCard({ report, bottom, getPhotoUrl, onClose, onDetails, onHeight, distance, onFund, onShare, canFund, canShare, isFavorite, onFavorite, favoritesReady }) {
  const { height } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const photos = report.photo_paths?.length ? report.photo_paths : [null];
  const presentation = reportPresentation(report);
  const status = ({ available: 'Available', claimed: 'In progress', completion_submitted: 'Awaiting review', changes_requested: 'In progress', completed: 'Completed' })[report.cleanup_state];
  const reporter = report.reporter?.display_name?.trim() || (report.reporter?.username ? `@${report.reporter.username}` : 'Community member');
  const amount = Math.max(0, Number(report.funded_amount_cents) || 0);
  const actions = [
    ...(canFund ? [{ text: 'Add funds', icon: 'wallet-outline', onPress: () => onFund(report) }] : []),
    ...(canShare ? [{ text: 'Share report', icon: 'share-outline', onPress: () => onShare(report) }] : []),
    { text: 'Close preview', icon: 'close-circle-outline', onPress: onClose },
  ];
  return <View onLayout={event => onHeight?.(event.nativeEvent.layout.height)} style={[styles.card, amount > 0 && styles.fundedCard, { bottom }]}>
    <ScrollView style={{ maxHeight: Math.min(height * 0.55, Math.max(160, height - bottom - 112)) }} bounces={false} nestedScrollEnabled>
    <View style={styles.hero} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={event => width && setPage(Math.round(event.nativeEvent.contentOffset.x / width))}>
        {photos.map((path, index) => <TouchableOpacity key={path || 'empty'} activeOpacity={0.9}
          accessibilityRole="button" accessibilityLabel={`View report, photo ${index + 1} of ${photos.length}`}
          onPress={() => onDetails(report)} style={{ width: width || 320, height: 160 }}>
          <RemotePhoto path={path} getUrl={getPhotoUrl} label={`${report.title || 'Report'} photo ${index + 1}`}
            style={{ width: '100%', height: 160 }} />
        </TouchableOpacity>)}
      </ScrollView>
      <View pointerEvents="none" style={styles.badge}><Text style={styles.badgeText}>{report.cancelled_at || report.expired_at ? presentation.status : status || presentation.status}</Text></View>
      <TouchableOpacity style={[styles.close, styles.heroClose]} accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        hitSlop={6}
        accessibilityState={{ selected: Boolean(isFavorite), disabled: !favoritesReady }}
        disabled={!favoritesReady} onPress={() => onFavorite(report.id)}>
        {isFavorite ? <Ionicons name="heart" size={26} color="#FFFFFF" /> : null}
        <Ionicons name="heart-outline" size={26} color="#FFFFFF" style={{ position: 'absolute', textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} />
      </TouchableOpacity>
      {photos.length > 1 ? <View pointerEvents="none" style={styles.dots} accessibilityLabel={`Photo ${page + 1} of ${photos.length}`}>
        {photos.map((path, index) => <View key={path || index} style={[styles.dot, { opacity: page === index ? 1 : 0.45 }]} />)}
      </View> : null}
    </View>
    <ReportCardDetails report={report} distance={distance} onPress={onDetails} options={<ReportCardMenu actions={actions} />} />
    </ScrollView>
  </View>;
}
export default function MapReportPreview({ report, nearby, bottom, insetBottom, getPhotoUrl, onClose, onChoose, onDetails, onCloseNearby, onHeight, distance, onFund, onShare, canFund = false, canShare = false, isFavorite = false, onFavorite, favoritesReady = false }) {
  const { fontScale } = useWindowDimensions();
  return <>
    {report ? <FloatingCard key={report.id} {...{ report, bottom, getPhotoUrl, onClose, onDetails, onHeight, distance, onFund, onShare, canFund, canShare, isFavorite, onFavorite, favoritesReady }} /> : null}
    <Modal visible={Boolean(nearby?.length)} transparent animationType="slide" onRequestClose={onCloseNearby}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} accessible={false} onPress={onCloseNearby} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insetBottom, 16), maxHeight: fontScale > 1.5 ? '90%' : '65%' }]}>
          <View style={styles.sheetHeader}><Text style={styles.heading} accessibilityRole="header">Reports here</Text><TouchableOpacity style={styles.close} accessibilityRole="button" accessibilityLabel="Close nearby reports" onPress={onCloseNearby}><Ionicons name="close" size={22} color="#435047" /></TouchableOpacity></View>
          <FlatList data={nearby || []} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={item.title || 'Preview report'} style={styles.result} onPress={() => onChoose(item)}><Photo report={item} getPhotoUrl={getPhotoUrl} /><Summary report={item} /><Ionicons name="chevron-forward" size={18} color="#435047" /></TouchableOpacity>} />
        </View>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  dropdown: { position: 'absolute', paddingVertical: 4, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EAE7', shadowColor: '#000000', shadowOpacity: 0.17, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 12 },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  dropdownDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ECEFEC' },
  dropdownText: { flex: 1, fontSize: 15, color: '#26332C' },
  card: { position: 'absolute', left: 16, right: 16, borderRadius: 20, backgroundColor: '#FFFFFF', shadowColor: '#000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 9 },
  fundedCard: { backgroundColor: '#F0F7F1', borderColor: '#2F7D32' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  copy: { flex: 1, gap: 5 }, title: { fontSize: 15, fontWeight: '700', color: '#25382D' }, status: { fontSize: 12, color: '#637067' }, reward: { fontSize: 13, fontWeight: '600', color: '#285D38' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 160, overflow: 'hidden', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#EDF2EE' },
  heroClose: { position: 'absolute', right: 6, top: 6, width: 36, height: 36 },
  badge: { position: 'absolute', left: 12, top: 14, maxWidth: '70%', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FFFFFF' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#25382D' },
  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 5, backgroundColor: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  details: { paddingHorizontal: 12, paddingVertical: 8 },
  poolAmount: { fontSize: 23, fontWeight: '800', color: '#202625' },
  previewCopy: { marginTop: 4, gap: 3 },
  previewTitle: { fontSize: 16, fontWeight: '600', color: '#25382D', lineHeight: 21 },
  distance: { fontSize: 13, color: '#637067' },
  creator: { fontSize: 12, color: '#637067', lineHeight: 17 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' }, sheet: { maxHeight: '65%', backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { flex: 1, fontSize: 22, fontWeight: '700', color: '#25382D' }, result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DFE6E0' },
});
