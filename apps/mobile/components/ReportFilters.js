import { loadDiscoveryReports } from '../lib/discoveryReports';
import { useProfile } from '../lib/profile';
import { mapLimitMessage } from '../lib/mapWorkBudget';
import LocationSearch from './LocationSearch';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReports } from '../lib/reports';
import { DEFAULT_REPORT_FILTERS } from '../lib/reportFilters';

const groups = [
  [
    'status',
    'Cleanup status',
    [
      ['all', 'All'],
      ['available', 'Available'],
      ['progress', 'In progress'],
      ['completed', 'Completed'],
    ],
  ],
  [
    'funding',
    'Reward',
    [
      ['all', 'Any reward'],
      ['funded', 'Funded'],
      ['volunteer', 'No funds yet'],
    ],
  ],
  [
    'radius',
    'Distance from map center',
    [
      [0, 'Any distance'],
      [5, '5 miles'],
      [25, '25 miles'],
      [50, '50 miles'],
    ],
  ],
  [
    'severity',
    'Severity',
    [
      ['all', 'All'],
      ['low', 'Low'],
      ['medium', 'Medium'],
      ['high', 'High'],
    ],
  ],
];
export default function ReportFilters({ map = false }) {
  const { filters, setFilters, filteredReports, loading, truncated, mapRegion, searchPlace } =
    useReports();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const { blockedIds } = useProfile();
  const [preview, setPreview] = useState(null);
  const draftChanged = Object.keys(filters).some(key => filters[key] !== draft[key]);
  useEffect(() => {
    if (!open || !draftChanged) { setPreview(null); return; }
    const controller = new AbortController();
    setPreview(null);
    const timer = setTimeout(() => loadDiscoveryReports({ area: mapRegion, filters: draft, searchPlace, blockedIds, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setPreview({ count: result.reports.length, truncated: result.truncated }); })
      .catch(() => {}), 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, draftChanged, draft, mapRegion, searchPlace, blockedIds]);
  const displayCount = draftChanged ? preview?.count : filteredReports.length;
  const displayTruncated = draftChanged ? preview?.truncated : truncated;
  const insets = useSafeAreaInsets();
  const activeFilters = groups
    .filter(([key]) => filters[key] !== DEFAULT_REPORT_FILTERS[key])
    .map(([key, , options]) => {
      const valueLabel = options.find(([value]) => value === filters[key])?.[1];
      return { key, label: key === 'severity' ? `${valueLabel} severity` : valueLabel };
    });
  if (filters.query.trim()) activeFilters.push({ key: 'query', label: `“${filters.query.trim()}”` });
  const count = activeFilters.length;
  const choose = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));
  return (
    <View
      style={[styles.header, map && styles.mapHeader]}
      pointerEvents="box-none"
    >
      <View style={styles.searchRow}>
        <View style={[styles.searchSurface, map && styles.mapSearchRow]}>
          {map ? (
            <View style={styles.logoArea}>
              <Image source={require('../assets/LB_Logo_PNG.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="Litterbugs" />
            </View>
          ) : null}
          <LocationSearch map={map} />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={count ? `Filters, ${count} active` : 'Filters'}
          accessibilityHint="Choose cleanup status, reward, distance, severity, and report keywords"
          onPress={() => { setDraft({ ...filters }); setOpen(true); }}
          style={[styles.filterButton, count > 0 && styles.selected]}
        >
          <Ionicons name="options-outline" size={25} color="#2F7D32" />
          {count > 0 ? <View style={styles.badge}><Text style={styles.badgeText} maxFontSizeMultiplier={1.3}>{count}</Text></View> : null}
        </TouchableOpacity>
      </View>
      {truncated ? <Text style={{ padding: 10, color: '#435047', backgroundColor: '#FFFFFF', borderRadius: 12 }}>{mapLimitMessage(truncated)}</Text> : null}
      {count > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters} contentContainerStyle={styles.activeFilterContent}>
          {activeFilters.map(({ key, label }) => (
            <TouchableOpacity key={key} style={styles.activeChipTarget}
              accessibilityRole="button" accessibilityLabel={`Remove ${label} filter`}
              onPress={() => choose(key, DEFAULT_REPORT_FILTERS[key])}>
              <View style={styles.activeChip}>
                <Ionicons name="close-circle" size={16} color="#245F2A" />
                <Text style={styles.chipText} >{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      <Modal
        visible={Boolean(open)}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            accessible={false}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
            accessibilityViewIsModal
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.title} accessibilityRole="header">
                Filters
              </Text>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setDraft({ ...DEFAULT_REPORT_FILTERS })}
                accessibilityRole="button"
              >
                <Text style={styles.chipText}>
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close filters without applying" onPress={() => setOpen(false)} style={styles.chip}><Ionicons name="close" size={24} color="#245F2A" /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {groups.map(([key, label, options]) => (
                <View key={key}>
                  <Text style={styles.label}>{label}</Text>
                  <View style={styles.options}>
                    {options.map(([value, text]) => (
                      <TouchableOpacity key={value} accessibilityRole="radio"
                        accessibilityState={{ checked: draft[key] === value }}
                        style={[styles.chip, draft[key] === value && styles.selected]}
                        onPress={() => setDraft(current => ({ ...current, [key]: value }))}>
                        <Text style={styles.chipText}>{key === 'status' && value === 'all' ? 'All reports' : text}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <Text style={styles.label}>Report keywords</Text>
              <TextInput value={draft.query} onChangeText={value => setDraft(current => ({ ...current, query: value }))} placeholder="Search report titles and notes" accessibilityLabel="Report keywords" style={styles.input} clearButtonMode="while-editing" />
            </ScrollView>
              <TouchableOpacity
                style={styles.done}
                accessibilityRole="button"
                onPress={() => { setFilters(draft); setOpen(false); }}
              >
                <Text style={styles.doneText}>
                  {displayCount == null || (!draftChanged && loading) ? 'Show reports' : `Show ${displayCount}${displayTruncated ? '+' : ''} ${displayCount === 1 ? 'report' : 'reports'}`}
                </Text>
              </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor: '#FFFFFF', padding: 12 },
  activeFilters: { marginTop: 4, flexGrow: 0 },
  activeFilterContent: { gap: 6, paddingRight: 2 },
  activeChipTarget: { minHeight: 44, maxWidth: 260, justifyContent: 'center' },
  activeChip: { minHeight: 32, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 18, borderWidth: 1, borderColor: '#2F7D32', backgroundColor: '#E8F2E9', flexDirection: 'row', alignItems: 'center', gap: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchSurface: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F4F2', borderRadius: 16 },
  logoArea: { width: 40, marginLeft: 4, alignItems: 'center' },
  logo: { width: 32, height: 32 },
  input: { fontSize: 15, color: '#202428', minHeight: 48, backgroundColor: '#F1F4F2', borderRadius: 12, paddingHorizontal: 12 },
  mapHeader: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 0 },
  mapSearchRow: { backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(25, 45, 32, 0.12)' },
  filterButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D6DED8', boxShadow: '0 2px 6px rgba(25, 45, 32, 0.10)' },
  badge: { position: 'absolute', top: -3, right: -2, minWidth: 21, minHeight: 21, paddingHorizontal: 4, borderRadius: 12, backgroundColor: '#2F7D32', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  chip: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D6DED8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selected: { backgroundColor: '#E8F2E9', borderColor: '#2F7D32' },
  chipText: { flexShrink: 1, color: '#245F2A', fontSize: 14, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#202428' },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 10,
    color: '#30363B',
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  done: {
    backgroundColor: '#2F7D32',
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginTop: 24,
  },
  doneText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
