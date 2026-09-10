import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SteadyButtonContent from './SteadyButtonContent';

export default function FundingAvailabilityNotice({ title, message, needsPhotos, canEditPhotos, pending, reportTitle, savedAmount, refreshing, refreshError, onEditPhotos, onRefresh, onReturn, bottomInset = 0 }) {
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 24 }]}>
    <View style={styles.icon}><Ionicons name={needsPhotos ? 'camera-outline' : 'time-outline'} size={27} color="#2F7D32" /></View>
    <Text style={styles.title}>{title}</Text>
    {reportTitle ? <Text style={styles.reportTitle}>{reportTitle}</Text> : null}
    <Text style={styles.body}>{message}</Text>
    {needsPhotos ? <View style={styles.guidance}>
      <Text style={styles.guidanceTitle}>Photos that help</Text>
      <Text style={styles.body}>Show the litter and the surrounding area in clear, well-lit photos.</Text>
      <Text style={styles.hint}>{canEditPhotos ? 'After you save your photos, we’ll review them automatically.' : 'The person who posted this report needs to update its photos before it can receive funding.'}</Text>
    </View> : null}
    {pending ? <Text style={styles.hint}>This page updates automatically while the review is in progress. You can return to the report at any time.</Text> : null}
    {savedAmount ? <View style={styles.saved}><Ionicons name="wallet-outline" size={21} color="#2F7D32" /><Text style={styles.savedText}>Your {savedAmount} choice is saved. You have not been charged.</Text></View> : null}
    {refreshError ? <Text style={styles.error} accessibilityRole="alert">We couldn’t refresh the status. Check your connection and try again.</Text> : null}
    {canEditPhotos ? <TouchableOpacity style={styles.primary} accessibilityRole="button" onPress={onEditPhotos}><Text style={styles.primaryText}>Edit photos</Text></TouchableOpacity> : null}
    {pending ? <TouchableOpacity style={styles.refresh} onPress={onRefresh} disabled={refreshing} accessibilityRole="button" accessibilityState={{ busy: refreshing, disabled: refreshing }}>
      <SteadyButtonContent label="Refresh status" busy={refreshing} busyLabel="Refreshing review status" textStyle={styles.secondaryText} color="#2F7D32" />
    </TouchableOpacity> : null}
    <TouchableOpacity style={canEditPhotos || pending ? styles.secondary : styles.primary} accessibilityRole="button" onPress={onReturn}>
      <Text style={canEditPhotos || pending ? styles.secondaryText : styles.primaryText}>Return to report</Text>
    </TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingTop: 28 },
  icon: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#EAF3EA', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { color: '#202824', fontSize: 25, lineHeight: 31, fontWeight: '700' },
  reportTitle: { color: '#68766D', fontSize: 14, lineHeight: 20, marginTop: 8 },
  body: { color: '#56635B', fontSize: 15, lineHeight: 23, marginTop: 12 },
  guidance: { borderWidth: 1, borderColor: '#DCE8DE', borderRadius: 16, padding: 16, marginTop: 24, backgroundColor: '#F4F8F4' },
  guidanceTitle: { color: '#2D4932', fontSize: 16, fontWeight: '600' },
  hint: { color: '#68766D', fontSize: 13, lineHeight: 20, marginTop: 12 },
  saved: { flexDirection: 'row', gap: 10, marginTop: 20, alignItems: 'flex-start' },
  savedText: { flex: 1, color: '#45614B', fontSize: 14, lineHeight: 21 },
  error: { color: '#9A3F32', fontSize: 14, lineHeight: 21, marginTop: 16 },
  primary: { backgroundColor: '#2F7D32', borderRadius: 13, minHeight: 52, padding: 14, marginTop: 26, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondary: { minHeight: 48, padding: 12, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  refresh: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: '#DCE8DE', borderRadius: 13, marginTop: 24 },
  secondaryText: { color: '#2F7D32', fontSize: 15, fontWeight: '600' },
});
