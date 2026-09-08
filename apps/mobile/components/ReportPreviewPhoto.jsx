import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export default function ReportPreviewPhoto({ report, getPhotoUrl }) {
  const path = report?.photo_paths?.[0];
  const [retry, setRetry] = useState(0);
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    let active = true;
    setPhoto(null);
    if (path) getPhotoUrl(path, { force: retry > 0 }).then(uri => {
      if (active) setPhoto({ path, uri, error: !uri });
    }).catch(() => { if (active) setPhoto({ path, error: true }); });
    return () => { active = false; };
  }, [path, getPhotoUrl, retry]);
  if (!path) return <View style={[styles.frame, styles.placeholder]}><Ionicons name="image-outline" size={24} color="#64716A" /><Text style={styles.hint}>No photo</Text></View>;
  if (photo?.path !== path) return <View style={styles.frame} accessibilityRole="progressbar" accessibilityLabel="Loading report photo" />;
  if (photo.error) return <TouchableOpacity style={[styles.frame, styles.placeholder]} accessibilityRole="button" accessibilityLabel="Retry report photo" onPress={() => { setPhoto(null); setRetry(value => value + 1); }}><Ionicons name="refresh-outline" size={22} color="#64716A" /><Text style={styles.hint}>Retry photo</Text></TouchableOpacity>;
  return <Image source={{ uri: photo.uri, cacheKey: path }} style={styles.frame} contentFit="cover" accessibilityLabel={report.title || 'Report photo'} onError={() => setPhoto({ path, error: true })} />;
}
const styles = StyleSheet.create({
  frame: { width: 76, height: 86, borderRadius: 12, backgroundColor: '#EDF2EE' },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  hint: { fontSize: 10, color: '#64716A' },
});
