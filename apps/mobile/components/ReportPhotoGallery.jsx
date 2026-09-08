import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useReports } from '../lib/reports';
function Photo({ uri, path, width, title }) {
  const { getReportPhotoUrl } = useReports();
  const [source, setSource] = useState(uri);
  const [retried, setRetried] = useState(false);
  useEffect(() => {
    setSource(uri);
    setRetried(false);
  }, [uri]);
  return (
    <Image
      source={{ uri: source, cacheKey: path || uri }}
      contentFit="cover"
      cachePolicy="memory-disk"
      style={{ width, height: 280, backgroundColor: '#E5E7EB' }}
      accessibilityLabel={`Litter reported: ${title || 'cleanup location'}`}
      onError={() => {
        if (retried || !path) return;
        setRetried(true);
        getReportPhotoUrl(path, { force: true })
          .then((url) => {
            if (url) setSource(url);
          })
          .catch(() => {});
      }}
    />
  );
}
export default function ReportPhotoGallery({ report, urls, loading, width }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [report?.id]);
  if (!report) return null;
  if (loading && !urls.length)
    return (
      <View style={styles.empty}>
        <ActivityIndicator color="#2F7D32" />
        <Text>Loading photos…</Text>
      </View>
    );
  if (!urls.length)
    return (
      <View style={styles.empty}>
        <Text style={styles.caption}>Photo unavailable</Text>
        <Text>The report details remain available below.</Text>
      </View>
    );
  return (
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
        {urls.map((uri, i) => (
          <Photo
            key={report.photo_paths?.[i] || uri}
            uri={uri}
            path={report.photo_paths?.[i]}
            width={width}
            title={report.title}
          />
        ))}
      </ScrollView>
      {urls.length > 1 ? (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1} / {urls.length}
          </Text>
        </View>
      ) : null}
      {report?.cleanup_state === 'completed' ? (
        <Text style={styles.caption}>Before cleanup</Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F1F4F2',
    marginBottom: 14,
  },
  empty: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F1F4F2',
    borderRadius: 18,
    marginBottom: 14,
  },
  counter: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  counterText: { color: '#FFFFFF', fontWeight: '700' },
  caption: { padding: 10, fontWeight: '600', color: '#4F5C63' },
});
