import RemotePhoto from './RemotePhoto';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReports } from '../lib/reports';
import { colors } from '../lib/theme';
function Photo({ uri, path, width, title }) {
  const { getReportPhotoUrl } = useReports();
  return <RemotePhoto path={path} uri={uri} getUrl={getReportPhotoUrl} label={`Litter reported: ${title || 'cleanup location'}`} style={{ width, height: Math.round(width / 1.73) }} />; // website report photo shape
}
export default function ReportPhotoGallery({ report, urls, loading, width }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [report?.id]);
  if (!report) return null;
  const photoCount = report.photo_paths?.length || urls.length;
  if (loading && !urls.length && !report.photo_paths?.length)
    return (
      <View style={[styles.empty, { width, alignSelf: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading photos…</Text>
      </View>
    );
  if (!urls.length && !report.photo_paths?.length)
    return (
      <View style={[styles.empty, { width, alignSelf: 'center' }]}>
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
            title={report.title}
          />
        ))}
      </ScrollView>
      {photoCount > 0 ? (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1} / {photoCount}
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
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.mist,
    borderRadius: 22,
    marginBottom: 14,
  },
  counter: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
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
