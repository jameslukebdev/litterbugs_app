import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Reserve the label's space throughout a request; only longer requests show motion.
export default function SteadyButtonContent({ label, busy, busyLabel, color = '#FFFFFF' }) {
  const [showProgress, setShowProgress] = useState(false);
  useEffect(() => {
    if (!busy) { setShowProgress(false); return; }
    const timer = setTimeout(() => setShowProgress(true), 400);
    return () => clearTimeout(timer);
  }, [busy]);
  return <View style={styles.content} accessible accessibilityLabel={busy ? busyLabel || label : label} accessibilityState={{ busy: Boolean(busy) }}>
    <Text style={[styles.label, { color }]}>{label}</Text>
    {busy && showProgress ? <ActivityIndicator style={styles.progress} size="small" color={color} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  content: { width: '100%', minHeight: 24, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  progress: { position: 'absolute', right: 5 },
});
