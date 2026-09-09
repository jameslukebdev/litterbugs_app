import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchPlaces, resolvePlace } from '../lib/placeSearch';
import { useReports } from '../lib/reports';

export default function LocationSearch({ map }) {
  const { fontScale } = useWindowDimensions();
  const { searchPlace, selectSearchPlace, clearSearchPlace } = useReports();
  const [open, setOpen] = useState(false), [text, setText] = useState('');
  const [results, setResults] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const sequence = useRef(0), selecting = useRef(false);
  const insets = useSafeAreaInsets();
  const close = () => { sequence.current += 1; selecting.current = false; setBusy(false); setOpen(false); };
  useEffect(() => {
    const seq = ++sequence.current;
    setResults([]); setError(null); setBusy(false); selecting.current = false;
    if (!open || text.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const places = await searchPlaces(text, { signal: controller.signal });
        if (seq === sequence.current) setResults(places);
      } catch { if (seq === sequence.current) setError('City search could not load. Retry or search the address.'); }
      finally { clearTimeout(timeout); if (seq === sequence.current) setBusy(false); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text, open]);
  const choose = async place => {
    if (selecting.current) return;
    selecting.current = true;
    const seq = ++sequence.current;
    setBusy(true); setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try { const resolved = await resolvePlace(place, { signal: controller.signal }); if (seq === sequence.current) { selectSearchPlace(resolved); close(); } }
    catch { if (seq === sequence.current) setError('Boundary could not load. Tap the city to try again.'); }
    finally { clearTimeout(timeout); if (seq === sequence.current) { selecting.current = false; setBusy(false); } }
  };
  const findAddress = async () => {
    if (!text.trim() || selecting.current) return;
    selecting.current = true;
    const seq = ++sequence.current; setBusy(true); setError(null);
    try {
      const points = await Location.geocodeAsync(text.trim());
      if (seq !== sequence.current) return;
      if (!points.length) { setError('No location found. Try a city and state or a full address.'); return; }
      // Address results are centers, never presented as a city boundary.
      setResults(points.slice(0, 5).map((p, i) => ({ id: `address:${i}`, label: text.trim(), subtitle: 'Address / area center · no boundary', region: { latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } })));
    } catch { if (seq === sequence.current) setError('Address search is unavailable. Please try again.'); }
    finally { if (seq === sequence.current) { selecting.current = false; setBusy(false); } }
  };
  const submitSearch = async () => {
    if (!text.trim() || selecting.current || busy) return;
    const cities = results.filter(place => !place.region);
    if (cities.length === 1) return choose(cities[0]);
    if (cities.length > 1) return;
    // Search can be pressed before the autocomplete debounce has completed.
    const seq = ++sequence.current;
    selecting.current = true; setBusy(true); setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const found = await searchPlaces(text, { signal: controller.signal });
      if (seq !== sequence.current) return;
      selecting.current = false; setBusy(false);
      if (found.length === 1) await choose(found[0]);
      else if (found.length > 1) setResults(found);
      else await findAddress();
    } catch {
      if (seq === sequence.current) setError('City search could not load. Try again or search the address.');
    } finally {
      clearTimeout(timeout);
      if (seq === sequence.current) { selecting.current = false; setBusy(false); }
    }
  };
  return <>
    <TouchableOpacity style={[styles.trigger, map && { backgroundColor: 'transparent' }]} accessibilityRole="button" accessibilityLabel={searchPlace ? `Search location: ${searchPlace.label}` : 'Search city or address'} onPress={() => { setText(''); setOpen(true); }}>
      <Ionicons name="search" size={18} color="#667078" />
      <Text numberOfLines={1} style={[styles.triggerText, !searchPlace && { color: '#68736C' }]}>{searchPlace?.label || (fontScale > 1.5 ? 'Search' : 'City or address')}</Text>
    </TouchableOpacity>
    {searchPlace ? <TouchableOpacity style={styles.clear} onPress={clearSearchPlace} accessibilityRole="button" accessibilityLabel="Clear location boundary"><Ionicons name="close-circle" size={21} color="#68736C" /></TouchableOpacity> : null}
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
        <View style={styles.row}>
          <View style={styles.field}><Ionicons name="search" size={20} color="#657169" /><TextInput autoFocus value={text} onChangeText={setText} placeholder="City, state or address" accessibilityLabel="City, state or address" style={styles.input} clearButtonMode="while-editing" returnKeyType="search" onSubmitEditing={submitSearch} /></View>
          <TouchableOpacity onPress={close} style={styles.clear} accessibilityRole="button"><Text style={styles.green}>Cancel</Text></TouchableOpacity>
        </View>
        {busy ? <ActivityIndicator style={{ margin: 20 }} color="#2F7D32" accessibilityLabel="Finding location" /> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <ScrollView keyboardShouldPersistTaps="handled">
          {results.map(place => <TouchableOpacity key={place.id} accessibilityRole="button" style={styles.result} onPress={() => place.region ? (selectSearchPlace(place), close()) : choose(place)}>
            <Ionicons name={place.region ? 'location-outline' : 'map-outline'} size={23} color="#2F7D32" />
            <View style={{ flex: 1 }}><Text style={styles.name}>{place.label}</Text><Text style={styles.subtitle}>{place.subtitle}</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#68736C" />
          </TouchableOpacity>)}
          {text.trim().length >= 2 && !busy ? <TouchableOpacity style={styles.result} accessibilityRole="button" onPress={findAddress}><Ionicons name="search" size={22} color="#2F7D32" /><Text style={styles.green}>Search this address</Text></TouchableOpacity> : null}
        </ScrollView>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  trigger: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1F4F2', borderRadius: 12 },
  triggerText: { flex: 1, fontSize: 15, color: '#23382A' }, clear: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, backgroundColor: '#FFF', paddingHorizontal: 16 }, row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: '#F1F4F2', borderRadius: 14 }, input: { flex: 1, minHeight: 52, fontSize: 16, color: '#23382A' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#DDE4DF' }, name: { fontSize: 17, fontWeight: '600', color: '#23382A' }, subtitle: { fontSize: 13, marginTop: 4, color: '#68736C' }, green: { fontSize: 16, fontWeight: '600', color: '#2F7D32' }, error: { color: '#B42318', marginVertical: 16 },
});
