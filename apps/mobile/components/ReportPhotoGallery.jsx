import RemotePhoto from './RemotePhoto';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReports } from '../lib/reports';
import { colors } from '../lib/theme';
function Photo({ uri, path, width, height, title }) {
  const { getReportPhotoUrl } = useReports();
  return <RemotePhoto path={path} uri={uri} getUrl={getReportPhotoUrl} label={`Litter reported: ${title || 'cleanup location'}`} style={{ width, height }} />;
}
// `aspect` is width / height: 1.73 is the website's report photo shape.
export default function ReportPhotoGallery({ report, urls, loading, width, aspect = 1.73 }) {
  const height = Math.round(width / aspect);
  const { getReportPhotoUrl } = useReports();
  const [index, setIndex] = useState(0);
  const [fullPhotoOpen, setFullPhotoOpen] = useState(false);
  const screen = useWindowDimensions();
  useEffect(() => { setIndex(0); setFullPhotoOpen(false); }, [report?.id]);
  if (!report) return null;
  const photoCount = report.photo_paths?.length || urls.length;
  if (loading && !urls.length && !report.photo_paths?.length)
    return (
      // The same shape as the photo that will replace it, so nothing below moves.
      <View style={[styles.frame, { width, height }]} accessibilityRole="progressbar" accessibilityLabel="Loading photos" />
    );
  if (!urls.length && !report.photo_paths?.length)
    return (
      <View style={[styles.empty, { width, height, alignSelf: 'center' }]}>
        <Text style={styles.caption}>Photo unavailable</Text>
        <Text style={styles.loadingText}>The report details remain available below.</Text>
      </View>
    );
  return (
    <>
    <View style={[styles.frame, { width }]}>
      <ScrollView
        key={report?.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
      >
        {(report.photo_paths?.length ? report.photo_paths : urls).map((path, i) => (
          <Photo
            key={report.photo_paths?.[i] || path}
            uri={urls[i]}
            path={report.photo_paths?.[i]}
            width={width}
            height={height}
            title={report.title}
          />
        ))}
      </ScrollView>
      {/* Website report sheet: "View full photo" shows the whole picture, uncropped. */}
      {photoCount > 0 ? (
        <TouchableOpacity style={styles.fullPhotoButton} onPress={() => setFullPhotoOpen(true)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`View full photo ${index + 1} of ${photoCount}`}>
          <Ionicons name="expand-outline" size={20} color={colors.ink} />
        </TouchableOpacity>
      ) : null}
      {photoCount > 0 ? (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1}/{photoCount}
          </Text>
        </View>
      ) : null}
    </View>
    {photoCount > 1 ? (
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: photoCount }, (_, photoIndex) => (
          <View key={photoIndex} style={[styles.dot, photoIndex === index && styles.dotActive]} />
        ))}
      </View>
    ) : null}
    <Modal visible={fullPhotoOpen} animationType="fade" onRequestClose={() => setFullPhotoOpen(false)} statusBarTranslucent>
      <View style={styles.fullPhotoBackdrop}>
        {fullPhotoOpen ? (
          <RemotePhoto
            path={report.photo_paths?.[index]}
            uri={urls[index]}
            getUrl={getReportPhotoUrl}
            fit="contain"
            background={colors.black}
            label={`Full photo ${index + 1} of ${photoCount}: ${report.title || 'litter report'}`}
            style={{ width: screen.width, height: screen.height }}
          />
        ) : null}
        <TouchableOpacity style={styles.fullPhotoClose} onPress={() => setFullPhotoOpen(false)} accessibilityRole="button" accessibilityLabel="Close full photo">
          <Ionicons name="close" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>
    </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.mist,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.mist,
    borderRadius: 22,
  },
  counter: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  fullPhotoButton: { position: 'absolute', right: 12, bottom: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.white },
  fullPhotoText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  fullPhotoBackdrop: { flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  fullPhotoClose: { position: 'absolute', top: 58, right: 20, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  counterText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 13,
    marginBottom: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.lineStrong },
  dotActive: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.primary },
  caption: { padding: 10, fontWeight: '600', color: colors.body },
  loadingText: { marginTop: 8, color: colors.muted, fontSize: 14, textAlign: 'center' },
});
