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
function Photo({ uri, path, width, title }) {
  const { getReportPhotoUrl } = useReports();
  return <RemotePhoto path={path} uri={uri} getUrl={getReportPhotoUrl} label={`Litter reported: ${title || 'cleanup location'}`} style={{ width, height: 355 }} />;
}
export default function ReportPhotoGallery({ report, urls, loading, width }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [report?.id]);
  if (!report) return null;
  const photoCount = report.photo_paths?.length || urls.length;
  if (loading && !urls.length && !report.photo_paths?.length)
    return (
      <View style={[styles.empty, { width, alignSelf: 'center' }]}>
        <ActivityIndicator color="#2F7D32" />
        <Text>Loading photos…</Text>
      </View>
    );
  if (!urls.length && !report.photo_paths?.length)
    return (
      <View style={[styles.empty, { width, alignSelf: 'center' }]}>
        <Text style={styles.caption}>Photo unavailable</Text>
        <Text>The report details remain available below.</Text>
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
    backgroundColor: '#F1F4F2',
  },
  empty: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F1F4F2',
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
  counterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 13,
    marginBottom: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#D1D5DB' },
  dotActive: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#2F7D32' },
  caption: { padding: 10, fontWeight: '600', color: '#4F5C63' },
});
