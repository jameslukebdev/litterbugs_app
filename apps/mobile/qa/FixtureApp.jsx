import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import MapView from 'react-native-maps';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ReportMapMarkers from '../components/ReportMapMarkers';
import useMapLabels from '../lib/useMapLabels';
import { DEFAULT_REPORT_FILTERS } from '../lib/reportFilters';
import { FIXTURE_REGION, selectFixtureReports } from './fixtures';

function FixtureMap() {
  const [scenario, setScenario] = useState('spectrum');
  const [filters, setFilters] = useState(DEFAULT_REPORT_FILTERS);
  const [region, setRegion] = useState(FIXTURE_REGION);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const [list, setList] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [tracking, setTracking] = useState(true);
  const mapRef = useRef(null);
  const { fontScale } = useWindowDimensions();
  const reports = useMemo(() => selectFixtureReports(scenario, filters, region), [scenario, filters, region]);
  const markers = useMemo(() => reports.map(report => ({ id: report.id, report, coordinate: { latitude: report.latitude, longitude: report.longitude } })), [reports]);
  const labels = useMapLabels({ markers, mapRef, ready, region, size, selectedId, fontScale });
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 350);
    return () => clearTimeout(timer);
  }, [labels]);
  useEffect(() => { SplashScreen.hideAsync(); }, []);
  function reset(name = scenario) {
    setScenario(name); setFilters(DEFAULT_REPORT_FILTERS); setSelectedId(null); setNearby([]); setList(false);
    setRegion(FIXTURE_REGION); mapRef.current?.animateToRegion(FIXTURE_REGION, 200);
  }
  function zoom(factor) {
    mapRef.current?.animateToRegion({ ...region, latitudeDelta: region.latitudeDelta * factor, longitudeDelta: region.longitudeDelta * factor }, 200);
  }
  const amountLabels = labels.filter(item => item.labelled && item.label).length;
  const selected = reports.find(item => item.id === selectedId);
  const options = (items, value, choose, prefix) => <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {items.map(([key, title]) => <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${prefix} ${title}`} accessibilityState={{ selected: value === key }} onPress={() => { setNearby([]); setSelectedId(null); choose(key); }} style={[styles.chip, value === key && styles.active]}><Text style={styles.text}>{title}</Text></Pressable>)}
  </ScrollView>;
  return <SafeAreaView style={styles.root}>
    <Text style={styles.heading}>Litterbugs Fixtures · local test data</Text>
    {options([['spectrum', 'All states'], ['crowded', 'Crowded'], ['overlap', 'Same location'], ['lifecycle', 'Lifecycle'], ['empty', 'Empty']], scenario, reset, 'Scenario')}
    {options([['all', 'All'], ['available', 'Available'], ['progress', 'In progress'], ['completed', 'Completed']], filters.status, status => setFilters({ ...filters, status }), 'Status')}
    {options([['all', 'Any reward'], ['funded', 'Funded'], ['volunteer', 'Volunteer']], filters.funding, funding => setFilters({ ...filters, funding }), 'Funding')}
    <View style={styles.row}>
      <Pressable style={styles.chip} accessibilityRole="button" accessibilityLabel="Toggle fixture reports" onPress={() => setList(!list)}><Text>{list ? 'Map' : 'Reports'}</Text></Pressable>
      <Text accessibilityLabel={`${reports.length} fixture reports, ${amountLabels} amount labels`} testID="fixture-count">{reports.length} reports · {amountLabels} amount labels</Text>
    </View>
    <View style={styles.mapArea} onLayout={event => setSize(event.nativeEvent.layout)}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={FIXTURE_REGION} onMapReady={() => setReady(true)} onRegionChangeComplete={setRegion}>
        <ReportMapMarkers markers={labels} selectedId={selectedId} tracksViewChanges={tracking} onChoose={report => { setSelectedId(report.id); setNearby([]); }} onNearby={setNearby} />
      </MapView>
      {list && <ScrollView style={styles.list}>{reports.length === 0 ? <Text style={styles.item}>No fixture reports</Text> : reports.map(report => <Pressable key={report.id} accessibilityRole="button" accessibilityLabel={`Open fixture ${report.id}`} onPress={() => { setList(false); setSelectedId(report.id); }}><Text style={styles.item}>{report.title} · {report.funded_amount_cents ? `$${report.funded_amount_cents / 100}` : 'Volunteer'}</Text></Pressable>)}</ScrollView>}
      {nearby.length > 0 && <ScrollView style={styles.preview}><Text style={styles.heading}>{nearby.length} reports here</Text>{nearby.map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Choose overlapping ${id}`} onPress={() => { setSelectedId(id); setNearby([]); }}><Text style={styles.item}>{reports.find(report => report.id === id)?.title}</Text></Pressable>)}</ScrollView>}
      {selected && !list && <View style={styles.preview}><Text style={styles.item}>{selected.title}</Text><Text style={styles.item}>Synthetic report — no claim, upload, or payment actions</Text><Pressable accessibilityRole="button" accessibilityLabel="Close fixture preview" onPress={() => setSelectedId(null)}><Text style={styles.item}>Close</Text></Pressable></View>}
    </View>
    <View style={styles.row}>
      {[['Zoom in', () => zoom(0.5)], ['Zoom out', () => zoom(2)], ['Reset map', () => reset()]].map(([title, action]) => <Pressable key={title} accessibilityRole="button" accessibilityLabel={title} style={styles.chip} onPress={action}><Text>{title}</Text></Pressable>)}
    </View>
  </SafeAreaView>;
}
export default function FixtureApp() { return <SafeAreaProvider><FixtureMap /></SafeAreaProvider>; }
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' }, heading: { padding: 10, fontSize: 15, fontWeight: '700', color: '#285D38' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 5 },
  chip: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#92A998', backgroundColor: '#FFFFFF' },
  active: { backgroundColor: '#EAF4EC', borderColor: '#285D38' }, text: { color: '#285D38' }, mapArea: { flex: 1 },
  list: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF' },
  item: { padding: 12, color: '#285D38', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#92A998' },
  preview: { position: 'absolute', left: 8, right: 8, bottom: 8, maxHeight: 260, borderRadius: 16, backgroundColor: '#FFFFFF' },
});
