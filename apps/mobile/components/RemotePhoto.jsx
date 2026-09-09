import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

// A changed source gets a fresh lifecycle, including native image callbacks.
export default function RemotePhoto(props) {
  return <PhotoRequest key={props.path || props.uri || 'empty'} {...props} />;
}
function PhotoRequest({ path, uri, getUrl, style, label = 'Report photo' }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(uri ? { uri } : null);
  useEffect(() => {
    let active = true;
    setResult(null);
    if (!path && !uri) return undefined;
    Promise.resolve().then(() => getUrl && path ? getUrl(path, { force: attempt > 0 }) : uri)
      .then(value => { if (active) setResult({ uri: value, error: !value }); })
      .catch(() => { if (active) setResult({ error: true }); });
    return () => { active = false; };
  }, [path, uri, getUrl, attempt]);
  const frame = [{ backgroundColor: '#EDF2EE', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style];
  if (!path && !uri) return <View style={frame}><Ionicons name="image-outline" size={24} color="#64716A" /><Text>No photo</Text></View>;
  if (!result) return <View style={frame} accessibilityRole="progressbar" accessibilityLabel="Loading report photo" />;
  if (result.error) return <TouchableOpacity style={frame} accessibilityRole="button" accessibilityLabel="Retry report photo" onPress={() => { setResult(null); setAttempt(value => value + 1); }}><Ionicons name="refresh-outline" size={22} color="#64716A" /><Text style={{ fontSize: 12, color: '#64716A', textAlign: 'center' }}>Retry photo</Text></TouchableOpacity>;
  return <Image key={attempt} source={{ uri: result.uri, cacheKey: path || result.uri }} style={style} contentFit="cover" accessibilityLabel={label} onError={() => setResult({ error: true })} />;
}
