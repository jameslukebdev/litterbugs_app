import Photo from './ReportPreviewPhoto';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
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
export default function MapReportPreview({ report, nearby, bottom, insetBottom, getPhotoUrl, onClose, onChoose, onDetails, onCloseNearby, onHeight, distance }) {
  return <>
    {report ? <View onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)} style={[styles.card, { bottom }]}>
      <View style={styles.row}><Photo report={report} getPhotoUrl={getPhotoUrl} /><View style={styles.copy}><Summary report={report} />{Number.isFinite(distance) ? <Text style={styles.status}>{distance < 0.1 ? 'Nearby' : `${distance.toFixed(1)} mi away`}</Text> : null}</View>
        <TouchableOpacity style={styles.close} accessibilityRole="button" accessibilityLabel="Close map preview" onPress={onClose}><Ionicons name="close" size={22} color="#435047" /></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.action} accessibilityRole="button" accessibilityLabel="View report" onPress={() => onDetails(report)}><Text style={styles.actionText}>View report</Text><Ionicons name="arrow-forward" size={18} color="white" /></TouchableOpacity>
    </View> : null}
    <Modal visible={Boolean(nearby?.length)} transparent animationType="slide" onRequestClose={onCloseNearby}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} accessible={false} onPress={onCloseNearby} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insetBottom, 16) }]}>
          <View style={styles.sheetHeader}><Text style={styles.heading} accessibilityRole="header">Reports here</Text><TouchableOpacity style={styles.close} accessibilityRole="button" accessibilityLabel="Close nearby reports" onPress={onCloseNearby}><Ionicons name="close" size={22} color="#435047" /></TouchableOpacity></View>
          <Text style={styles.hint}>Choose a cleanup to preview on the map.</Text>
          <FlatList data={nearby || []} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={item.title || 'Preview report'} style={styles.result} onPress={() => onChoose(item)}><Photo report={item} getPhotoUrl={getPhotoUrl} /><Summary report={item} /><Ionicons name="chevron-forward" size={18} color="#435047" /></TouchableOpacity>} />
        </View>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  card: { position: 'absolute', left: 16, right: 16, borderRadius: 20, padding: 14, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  copy: { flex: 1, gap: 5 }, title: { fontSize: 15, fontWeight: '700', color: '#25382D' }, status: { fontSize: 12, color: '#637067' }, reward: { fontSize: 13, fontWeight: '600', color: '#285D38' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  action: { minHeight: 44, marginTop: 12, backgroundColor: '#2F7D32', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, actionText: { color: 'white', fontSize: 15, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' }, sheet: { maxHeight: '65%', backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { fontSize: 22, fontWeight: '700', color: '#25382D' }, hint: { fontSize: 14, color: '#637067', marginBottom: 14 }, result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DFE6E0' },
});
