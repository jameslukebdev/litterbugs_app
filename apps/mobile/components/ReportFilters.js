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
  Switch,
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
  ['favoritesOnly', 'Favorites', [[false, 'All reports'], [true, 'Favorites only']]],
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
  const { favoriteIds, filters, setFilters, filteredReports, loading, truncated, mapRegion, searchPlace } =
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
    const timer = setTimeout(() => loadDiscoveryReports({ area: mapRegion, filters: draft, searchPlace, blockedIds, favoriteIds, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setPreview({ count: result.reports.length, truncated: result.truncated }); })
      .catch(() => {}), 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, draftChanged, draft, mapRegion, searchPlace, blockedIds, favoriteIds]);
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
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close filters without applying" onPress={() => setOpen(false)} style={styles.closeButton}><Ionicons name="close" size={22} color="#303A34" /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.filterContent}>
              {groups.map(([key, label, options]) => (
                key === 'favoritesOnly' ? (
                  <View key={key} style={styles.favoritesRow}>
                    <Ionicons name="heart-outline" size={21} color="#687178" />
                    <Text style={styles.favoritesLabel}>Favorites only</Text>
                    <Switch value={draft.favoritesOnly} onValueChange={value => setDraft(current => ({ ...current, favoritesOnly: value }))} accessibilityLabel="Favorites only" trackColor={{ false: '#DDE3DF', true: '#2F7D32' }} />
                  </View>
                ) : <View key={key} style={styles.filterSection}>
                  <Text style={styles.label}>{label}</Text>
                  <View style={styles.options}>
                    {options.map(([value, text]) => (
                      <TouchableOpacity key={value} accessibilityRole="radio"
                        accessibilityState={{ checked: draft[key] === value }}
                        style={[styles.choice, (key === 'status' || key === 'radius') ? styles.gridChoice : styles.inlineChoice, draft[key] === value && styles.selected]}
                        onPress={() => setDraft(current => ({ ...current, [key]: value }))}>
                        <Text style={[styles.choiceText, draft[key] === value && styles.choiceTextSelected]}>{key === 'status' && value === 'all' ? 'All reports' : text}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              <View style={styles.filterSection}><Text style={styles.label}>Report keywords</Text>
              <TextInput value={draft.query} onChangeText={value => setDraft(current => ({ ...current, query: value }))} placeholder="Search report titles and notes" accessibilityLabel="Report keywords" style={styles.input} clearButtonMode="while-editing" /></View>
            </ScrollView>
            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={() => setDraft({ ...DEFAULT_REPORT_FILTERS })} accessibilityRole="button" accessibilityLabel="Reset all filters">
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E8ECE9',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#202428' },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    color: '#30363B',
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F5F4' },
  filterContent: { paddingHorizontal: 20, paddingBottom: 20 },
  favoritesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#E8ECE9' },
  favoritesLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#30363B' },
  filterSection: { paddingTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E8ECE9' },
  choice: { minHeight: 48, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#DCE3DE', alignItems: 'center', justifyContent: 'center' },
  gridChoice: { width: '48%', flexGrow: 1 },
  inlineChoice: { flex: 1 },
  choiceText: { color: '#4F5C63', fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '500' },
  choiceTextSelected: { color: '#245F2A', fontWeight: '600' },
  filterFooter: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E8ECE9', flexDirection: 'row', alignItems: 'center', gap: 20 },
  resetButton: { minHeight: 48, paddingHorizontal: 6, justifyContent: 'center' },
  resetText: { color: '#303A34', fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  done: {
    flex: 1,
    backgroundColor: '#2F7D32',
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  doneText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
