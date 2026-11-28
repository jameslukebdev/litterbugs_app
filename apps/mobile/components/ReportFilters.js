import { loadDiscoveryReports } from '../lib/discoveryReports';
import { useProfile } from '../lib/profile';
import { mapLimitMessage } from '../lib/mapWorkBudget';
import LocationSearch from './LocationSearch';
import { trackFilterChanges } from '../lib/analytics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReports } from '../lib/reports';
import { DEFAULT_REPORT_FILTERS, matchesReportFilters } from '../lib/reportFilters';
import BrandBug from './BrandBug';
import SlideUp from './SlideUp';
import { colors, fonts } from '../lib/theme';

// Website "Search and filters" (apps/web report-browser): same wording and order,
// with each status labelled by its map bug and "Has a fund" by the bee.
const groups = [
  ['status', 'Cleanup status', [['all', 'All'], ['available', 'Needs a cleanup', 'ladybug'], ['progress', 'Being cleaned', 'caterpillar'], ['completed', 'Cleaned up', 'flower']]],
  ['funding', 'Cleanup fund', [['all', 'Any'], ['funded', 'Has a fund', 'bee'], ['volunteer', 'Volunteer']]],
  ['severity', 'Priority', [['all', 'All'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]],
  ['radius', 'Distance from map center', [[0, 'Any'], [5, '5 mi'], [25, '25 mi'], [50, '50 mi']]],
  ['visibility', 'Hidden reports', [['visible', 'Visible'], ['hidden', 'Hidden']]],
  ['favoritesOnly', 'Favorites', [[false, 'All reports'], [true, 'Favorites only']]],
];
export default function ReportFilters({ map = false }) {
  const { fontScale } = useWindowDimensions();
  const { favoriteIds, hiddenIds, filters, setFilters, applyFilters, filteredReports, loading, truncated, mapRegion, searchPlace } =
    useReports();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const { blockedIds } = useProfile();
  const draftChanged = Object.keys(filters).some(key => filters[key] !== draft[key]);
  // While the sheet is open, every report in this map area is loaded once, so each tap
  // recounts on the phone at once instead of waiting on a new search.
  const [areaReports, setAreaReports] = useState(null);
  useEffect(() => {
    if (!open) { setAreaReports(null); return undefined; }
    const controller = new AbortController();
    loadDiscoveryReports({ area: mapRegion, filters: DEFAULT_REPORT_FILTERS, searchPlace, blockedIds, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setAreaReports(result); })
      .catch(() => {});
    return () => controller.abort();
  }, [open, mapRegion, searchPlace, blockedIds]);
  const areaComplete = areaReports && !areaReports.truncated;
  const localCount = useMemo(() => (areaComplete
    ? areaReports.reports.filter(report => matchesReportFilters(report, draft, mapRegion, favoriteIds, hiddenIds)).length
    : null), [areaComplete, areaReports, draft, mapRegion, favoriteIds, hiddenIds]);
  // Very busy areas (more reports than one load holds) still ask the server for each count.
  const [preview, setPreview] = useState(null);
  const needsServerCount = open && draftChanged && areaReports?.truncated;
  useEffect(() => {
    if (!needsServerCount) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => loadDiscoveryReports({ area: mapRegion, filters: draft, searchPlace, blockedIds, favoriteIds, hiddenIds, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setPreview({ draft, count: result.reports.length, truncated: result.truncated }); })
      .catch(() => {}), 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [needsServerCount, draft, mapRegion, searchPlace, blockedIds, favoriteIds, hiddenIds]);
  const current = !draftChanged
    ? (loading ? null : { count: filteredReports.length, truncated })
    : localCount != null ? { count: localCount, truncated: false }
      : preview?.draft === draft ? preview : null;
  // Keep the last count on the button until the next one is known, so it never blinks.
  const lastShown = useRef(null);
  if (current) lastShown.current = current;
  const shown = current || lastShown.current;
  const showLabel = !shown ? 'Show results'
    : shown.count === 0 ? 'No matching reports'
      : `Show ${shown.count}${shown.truncated ? '+' : ''} ${shown.count === 1 ? 'result' : 'results'}`;
  const insets = useSafeAreaInsets();
  const activeFilters = groups
    .filter(([key]) => filters[key] !== DEFAULT_REPORT_FILTERS[key])
    .map(([key, , options]) => {
      const valueLabel = options.find(([value]) => value === filters[key])?.[1];
      return { key, label: key === 'severity' ? `${valueLabel} priority` : key === 'radius' ? `Within ${valueLabel}` : valueLabel };
    });
  if (filters.query.trim()) activeFilters.push({ key: 'query', label: `“${filters.query.trim()}”` });
  const count = activeFilters.length;
  const choose = (key, value) => {
    trackFilterChanges(filters, { ...filters, [key]: value }, 'chip');
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const filterButton = (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={count ? `Filters, ${count} active` : 'Filters'}
          accessibilityHint="Choose cleanup status, reward, distance, severity, and report keywords"
          onPress={() => { setDraft({ ...filters }); lastShown.current = null; setOpen(true); }}
          style={[styles.filterButton, count > 0 && styles.selected]}
        >
          {/* Plum-outlined filter button with just its icon, on the map and the Reports page. */}
          <Ionicons name="options-outline" size={22} color={colors.plum} />
          {count > 0 ? <View style={styles.badge}><Text style={styles.badgeText} maxFontSizeMultiplier={1.3}>{count}</Text></View> : null}
        </TouchableOpacity>
  );
  return (
    <View
      style={[styles.header, map && styles.mapHeader]}
      pointerEvents="box-none"
    >
      <View style={[styles.searchRow, map && styles.mapSearchShell]}>
        <View style={styles.searchSurface}>
          <LocationSearch map={map} />
        </View>
        {filterButton}
      </View>
      {truncated ? <Text style={{ padding: 10, color: colors.body, backgroundColor: colors.white, borderRadius: 12 }}>{mapLimitMessage(truncated)}</Text> : null}
      {count > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters} contentContainerStyle={styles.activeFilterContent}>
          {activeFilters.map(({ key, label }) => (
            <TouchableOpacity key={key} style={styles.activeChipTarget}
              accessibilityRole="button" accessibilityLabel={`Remove ${label} filter`}
              onPress={() => choose(key, DEFAULT_REPORT_FILTERS[key])}>
              <View style={styles.activeChip}>
                <Ionicons name="close-circle" size={16} color={colors.primaryDark} />
                <Text style={styles.chipText} >{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      <Modal
        visible={Boolean(open)}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            accessible={false}
            onPress={() => setOpen(false)}
          />
          <SlideUp
            open={Boolean(open)}
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
            accessibilityViewIsModal
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.title} accessibilityRole="header">
                Search and filters
              </Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close filters without applying" onPress={() => setOpen(false)} style={styles.closeButton}><Ionicons name="close" size={22} color={colors.ink} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.filterContent}>
              <View style={styles.filterSection}>
                <Text style={styles.label}>Search report titles and notes</Text>
                <TextInput value={draft.query} onChangeText={value => setDraft(current => ({ ...current, query: value }))} placeholder="Bottles, roadside…" placeholderTextColor={colors.subtle} autoCapitalize="none" autoCorrect={false} returnKeyType="search" accessibilityLabel="Search report titles and notes" style={styles.input} clearButtonMode="while-editing" />
              </View>
              {groups.map(([key, label, options]) => (
                key === 'favoritesOnly' ? (
                  <View key={key} style={styles.favoritesRow}>
                    <Ionicons name="heart-outline" size={21} color={colors.muted} />
                    <Text style={styles.favoritesLabel}>Favorites only</Text>
                    <Switch value={draft.favoritesOnly} onValueChange={value => setDraft(current => ({ ...current, favoritesOnly: value }))} accessibilityLabel="Favorites only" trackColor={{ false: colors.line, true: colors.primary }} />
                  </View>
                ) : <View key={key} style={styles.filterSection}>
                  <Text style={styles.label}>{label}</Text>
                  <View style={styles.options}>
                    {options.map(([value, text, bug]) => {
                      const selected = draft[key] === value;
                      return (
                        <TouchableOpacity key={String(value)} accessibilityRole="radio"
                          accessibilityLabel={text}
                          accessibilityState={{ checked: selected }}
                          style={[styles.choice, selected && styles.choiceSelected]}
                          onPress={() => setDraft(current => ({ ...current, [key]: value }))}>
                          {bug ? <BrandBug kind={bug} size={17} active={selected} /> : null}
                          <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{text}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={[styles.filterFooter, fontScale > 1.5 && { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
              <TouchableOpacity style={styles.resetButton} onPress={() => setDraft({ ...DEFAULT_REPORT_FILTERS })} accessibilityRole="button" accessibilityLabel="Reset all filters">
                <Text style={styles.resetText}>Reset filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.done, fontScale > 1.5 && { flex: 0, paddingVertical: 10 }]}
                accessibilityRole="button"
                onPress={() => {
                  if (draftChanged) {
                    trackFilterChanges(filters, draft, 'sheet');
                    applyFilters(draft, areaComplete ? areaReports : null);
                  }
                  setOpen(false);
                }}
              >
                <Text style={[styles.doneText, { textAlign: 'center' }]}>{showLabel}</Text>
              </TouchableOpacity>
            </View>
          </SlideUp>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor: colors.white, padding: 12 },
  activeFilters: { marginTop: 4, flexGrow: 0 },
  activeFilterContent: { gap: 6, paddingRight: 2 },
  activeChipTarget: { minHeight: 44, maxWidth: 260, justifyContent: 'center' },
  activeChip: { minHeight: 32, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 18, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // The search box and filter button look the same on the map and the Reports page.
  searchSurface: { flex: 1, minWidth: 0, minHeight: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line, borderRadius: 14, borderCurve: 'continuous', boxShadow: '0 2px 6px rgba(46, 37, 128, 0.14)' },
  input: { fontSize: 16, color: colors.ink, minHeight: 48, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.lineStrong, borderRadius: 12, paddingHorizontal: 12 },
  mapHeader: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 0 },
  // On the map: a white outlined search field and a white round filter button, straight on the map.
  mapSearchShell: { minHeight: 58, gap: 10, paddingVertical: 3 },
  filterButton: { width: 50, minWidth: 50, height: 50, paddingHorizontal: 0, borderRadius: 14, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.cleanEdge, boxShadow: '0 2px 6px rgba(46, 37, 128, 0.14)' },
  badge: { position: 'absolute', top: -3, right: -2, minWidth: 21, minHeight: 21, paddingHorizontal: 4, borderRadius: 12, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  chip: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selected: { backgroundColor: colors.plumSoft, borderColor: colors.plum },
  chipText: { flexShrink: 1, color: colors.primaryDark, fontSize: 14, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  title: { fontSize: 28, lineHeight: 32, fontFamily: fonts.heading, color: colors.ink },
  label: { fontSize: 15, fontWeight: '800', marginBottom: 10, color: colors.ink },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist },
  filterContent: { paddingHorizontal: 20, paddingBottom: 20 },
  favoritesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 18 },
  favoritesLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  filterSection: { paddingTop: 16 },
  choice: { minHeight: 42, paddingHorizontal: 15, borderRadius: 21, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  choiceText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  choiceTextSelected: { color: colors.primaryDark, fontWeight: '800' },
  choiceSelected: { borderWidth: 2, borderColor: colors.primary },
  filterFooter: { paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resetButton: { minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: colors.lineStrong, backgroundColor: colors.white },
  resetText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  done: {
    flex: 1,
    backgroundColor: colors.primary,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  doneText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
