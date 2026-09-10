import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

// A changed source gets a fresh lifecycle, including native image callbacks.
export default function RemotePhoto(props) {
  return <PhotoRequest key={props.path || props.uri || 'empty'} {...props} />;
}
function PhotoRequest({ path, uri, getUrl, style, label = 'Report photo' }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(uri ? { uri } : null);
  const request = useRef({ path, uri, getUrl });
  request.current.getUrl = getUrl;
  request.current.uri = uri;
  useEffect(() => {
    if (uri) setResult(current => current?.uri && !current.error ? current : { uri });
  }, [uri]);
  useEffect(() => {
    let active = true;
    const { path, uri, getUrl } = request.current;
    // The parent may receive a signed URL after this image has already loaded.
    // That hint is not a new photo and must not unmount the native image.
    if (attempt === 0 && uri) return undefined;
    setResult(null);
    if (!path && !uri) return undefined;
    Promise.resolve().then(() => getUrl && path ? getUrl(path, { force: attempt > 0 }) : uri)
      .then(value => { if (active) setResult(current => current?.uri && !current.error ? current : { uri: value, error: !value }); })
      .catch(() => { if (active) setResult(current => current?.uri && !current.error ? current : { error: true }); });
    return () => { active = false; };
  }, [attempt]);
  const frame = [{ backgroundColor: '#EDF2EE', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style];
  if (!path && !uri) return <View style={frame}><Ionicons name="image-outline" size={24} color="#64716A" /><Text>No photo</Text></View>;
  if (!result) return <View key="loading" style={frame} accessibilityRole="progressbar" accessibilityLabel="Loading report photo" />;
  if (result.error) return <TouchableOpacity style={frame} accessibilityRole="button" accessibilityLabel="Retry report photo" onPress={() => { setResult(null); setAttempt(value => value + 1); }}><Ionicons name="refresh-outline" size={22} color="#64716A" /><Text style={{ fontSize: 12, color: '#64716A', textAlign: 'center' }}>Retry photo</Text></TouchableOpacity>;
  // A distinct host prevents Android from retaining the old progress label
  // when it reuses the loading View for the finished photo.
  return <View key="loaded" style={frame}>
    <Image key={attempt} source={{ uri: result.uri, cacheKey: path || result.uri }}
      style={StyleSheet.absoluteFill} contentFit="cover" transition={180}
      cachePolicy="memory-disk" recyclingKey={path || result.uri}
      accessibilityLabel={label} onError={() => setResult({ error: true })} />
  </View>;
}
