import * as Location from 'expo-location';
import { useState } from 'react';
import {
  Image,
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
      ['volunteer', 'Volunteer'],
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
  const { filters, setFilters, filteredReports, commitMapRegion } =
    useReports();
  const [place, setPlace] = useState('');
  const [placeError, setPlaceError] = useState(null);
  const [finding, setFinding] = useState(false);
  const findPlace = async () => {
    if (!place.trim() || finding) return;
    setFinding(true);
    setPlaceError(null);
    try {
      const results = await Location.geocodeAsync(place.trim());
      if (!results.length) {
        setPlaceError(
          'No location found. Try a city and state or a full address.',
        );
        return;
      }
      commitMapRegion({
        latitude: results[0].latitude,
        longitude: results[0].longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      });
      setOpen(false);
    } catch {
      setPlaceError(
        'Location search is unavailable. Try again or move the map.',
      );
    } finally {
      setFinding(false);
    }
  };
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState('all');
  const statusOnly = panel === 'status';
  const openPanel = (value) => {
    setPanel(value);
    setOpen(true);
  };
  const statusLabel =
    filters.status === 'all'
      ? 'All reports'
      : groups[0][2].find(([value]) => value === filters.status)?.[1] ||
        'All reports';
  const insets = useSafeAreaInsets();
  const count = groups.filter(
    ([key]) => key !== 'status' && filters[key] !== DEFAULT_REPORT_FILTERS[key],
  ).length;
  const choose = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));
  return (
    <View
      style={[styles.header, map && styles.mapHeader]}
      pointerEvents="box-none"
    >
      <View style={[styles.searchRow, map && styles.mapSearchRow]}>
        {map ? (
          <Image
            source={require('../assets/LB_Logo_PNG.png')}
            resizeMode="contain"
            style={styles.logo}
            accessibilityLabel="Litterbugs"
          />
        ) : null}
        <View style={[styles.search, map && styles.mapSearch]}>
          <Ionicons name="search" size={18} color="#667078" />
          <TextInput
            style={styles.input}
            value={filters.query}
            onChangeText={(value) => choose('query', value)}
            placeholder="Search reports"
            accessibilityLabel="Search report titles and notes"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>
      <View style={styles.quickControls} pointerEvents="box-none">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Cleanup status: ${statusLabel}`}
          accessibilityHint="Choose all, available, in progress, or completed reports"
          onPress={() => openPanel('status')}
          style={[
            styles.quickControl,
            map && styles.floatingControl,
            filters.status !== 'all' && styles.selected,
          ]}
        >
          <Text style={styles.quickControlText}>{statusLabel}</Text>
          <Ionicons name="chevron-down" size={16} color="#4F5C63" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            count ? `More filters, ${count} active` : 'More filters'
          }
          onPress={() => openPanel('all')}
          style={[
            styles.quickControl,
            map && styles.floatingControl,
            count > 0 && styles.selected,
          ]}
        >
          <Ionicons name="options-outline" size={18} color="#4F5C63" />
          <Text style={styles.quickControlText}>
            Filters{count ? ` · ${count}` : ''}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={Boolean(open)}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
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
                {statusOnly ? 'Cleanup status' : 'Find a cleanup'}
              </Text>
              <TouchableOpacity
                style={styles.chip}
                onPress={() =>
                  statusOnly
                    ? setOpen(false)
                    : setFilters(DEFAULT_REPORT_FILTERS)
                }
                accessibilityRole="button"
              >
                <Text style={styles.chipText}>
                  {statusOnly ? 'Done' : 'Reset'}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {!statusOnly ? (
                <>
                  <Text style={styles.label}>Explore an area</Text>
                  <View style={styles.searchRow}>
                    <TextInput
                      value={place}
                      onChangeText={setPlace}
                      placeholder="City, neighborhood or address"
                      accessibilityLabel="Search for a location"
                      style={[
                        styles.search,
                        styles.input,
                        { paddingHorizontal: 12 },
                      ]}
                      onSubmitEditing={findPlace}
                      returnKeyType="search"
                    />
                    <TouchableOpacity
                      style={styles.chip}
                      disabled={finding}
                      onPress={findPlace}
                      accessibilityRole="button"
                    >
                      <Text style={styles.chipText}>
                        {finding ? 'Finding…' : 'Go'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {placeError ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={{ color: '#B42318', marginTop: 8 }}
                    >
                      {placeError}
                    </Text>
                  ) : null}
                </>
              ) : null}
              {(statusOnly ? [groups[0]] : groups).map(
                ([key, label, options]) => (
                  <View key={key}>
                    {!statusOnly ? (
                      <Text style={styles.label}>{label}</Text>
                    ) : null}
                    <View
                      style={statusOnly ? styles.statusOptions : styles.options}
                    >
                      {options.map(([value, text]) => (
                        <TouchableOpacity
                          key={value}
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked: filters[key] === value,
                          }}
                          style={[
                            statusOnly ? styles.statusOption : styles.chip,
                            !statusOnly &&
                              filters[key] === value &&
                              styles.selected,
                          ]}
                          onPress={() => {
                            choose(key, value);
                            if (statusOnly) setOpen(false);
                          }}
                        >
                          <Text
                            style={
                              statusOnly
                                ? styles.statusOptionText
                                : styles.chipText
                            }
                          >
                            {statusOnly && value === 'all'
                              ? 'All reports'
                              : text}
                          </Text>
                          {statusOnly ? (
                            <Ionicons
                              name={
                                filters[key] === value
                                  ? 'checkmark-circle'
                                  : 'ellipse-outline'
                              }
                              size={23}
                              color={
                                filters[key] === value ? '#2F7D32' : '#BBC4BE'
                              }
                            />
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ),
              )}
            </ScrollView>
            {!statusOnly ? (
              <TouchableOpacity
                style={styles.done}
                accessibilityRole="button"
                onPress={() => setOpen(false)}
              >
                <Text style={styles.doneText}>
                  Show {filteredReports.length}{' '}
                  {filteredReports.length === 1 ? 'report' : 'reports'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor: '#FFFFFF', padding: 12, gap: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44 },
  search: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#F1F4F2',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 7,
  },
  input: { flex: 1, fontSize: 15, color: '#202428', minHeight: 44 },
  mapHeader: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 0,
    gap: 8,
  },
  mapSearchRow: {
    minHeight: 56,
    paddingHorizontal: 10,
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    boxShadow: '0 2px 8px rgba(25, 45, 32, 0.12)',
  },
  mapSearch: { backgroundColor: 'transparent', paddingHorizontal: 6 },
  quickControls: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  quickControl: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6DED8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickControlText: {
    flexShrink: 1,
    color: '#303B34',
    fontSize: 15,
    fontWeight: '600',
  },
  floatingControl: {
    borderColor: '#FFFFFF',
    boxShadow: '0 2px 6px rgba(25, 45, 32, 0.10)',
  },
  statusOptions: { marginTop: 12 },
  statusOption: {
    minHeight: 60,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E1E6E3',
  },
  statusOptionText: {
    flex: 1,
    color: '#303B34',
    fontSize: 17,
    fontWeight: '600',
  },
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
  chipText: { color: '#245F2A', fontSize: 14, fontWeight: '600' },
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
