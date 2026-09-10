import { DEFAULT_REPORT_FILTERS } from './lib/reportFilters';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Modal,
  useWindowDimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReportFilters from './components/ReportFilters';
import ReportList from './ReportList';
import { getBottomNavClearance } from './lib/navigationLayout';
import { getDistanceMiles, useReports } from './lib/reports';
import useReportsLocation from './lib/useReportsLocation';


export default function ReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState('newest');
  const [sortAnchor, setSortAnchor] = useState(null);
  const lastSortAnchor = useRef(null);
  const sortButtonRef = useRef(null);
  const { width, height } = useWindowDimensions();
  useEffect(() => setSortAnchor(null), [width, height]);
  useEffect(() => navigation.addListener('blur', () => setSortAnchor(null)), [navigation]);
  const { origin, status: locationState, refresh: refreshLocation } = useReportsLocation({ enabled: false });
  const locationOrigin = sort === 'closest' ? origin : null;
  const {
    filteredReports: reports,
    loading: reportsLoading,
    refreshing,
    refreshReports,
    filters, setFilters, error, searchPlace, selectedMapReportId, setSelectedMapReportId,
  } = useReports();

  const nearbyReports = useMemo(() => [...reports].sort((left, right) => {
    if (locationOrigin) {
      const leftDistance = getDistanceMiles(locationOrigin, left);
      const rightDistance = getDistanceMiles(locationOrigin, right);
      if (leftDistance != null && rightDistance != null && leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
      if (leftDistance != null) return -1;
      if (rightDistance != null) return 1;
    }

    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
  }), [locationOrigin, reports]);


  const areaText = searchPlace ? `${searchPlace.label} · ${searchPlace.geometry ? 'search area' : 'map area'}` : 'Map area';
  const chooseSort = () => {
    sortButtonRef.current?.measureInWindow((x, y, buttonWidth, buttonHeight) => {
      const anchor = { left: Math.max(16, Math.min(x + buttonWidth - 232, width - 248)), top: Math.min(y + buttonHeight + 6, height - insets.bottom - 160) };
      lastSortAnchor.current = anchor;
      setSortAnchor(anchor);
    });
  };
  const selectSort = value => {
    setSortAnchor(null);
    setSort(value);
    if (value === 'closest') refreshLocation({ requestPermission: true });
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active' && sort === 'closest') refreshLocation(); });
    return () => subscription.remove();
  }, [sort, refreshLocation]);

  const handleReportPress = (report) => {
    setSelectedMapReportId(report.id);
    navigation.navigate('Map', { reportId: report.id, returnTo: 'Reports' });
  };

  return (
    <View style={styles.container}>
      <ReportFilters />
      <View style={styles.summary}>
        <View style={styles.summaryCopy}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryArea}>
              <Text style={styles.count} accessibilityLiveRegion="polite">
                {reportsLoading && reports.length === 0 ? 'Loading reports…' : `${nearbyReports.length} ${nearbyReports.length === 1 ? 'report' : 'reports'}`}
              </Text>
              <Text style={styles.area}>{areaText}</Text>
            </View>
            <TouchableOpacity ref={sortButtonRef} accessibilityRole="button" accessibilityLabel={`Sort reports: ${locationOrigin ? 'Closest to me' : 'Newest first'}`} accessibilityState={{ expanded: !!sortAnchor }} onPress={chooseSort} style={[styles.sortButton, sortAnchor && styles.sortButtonOpen]}>
              <Ionicons name="swap-vertical-outline" size={16} color="#2F7D32" />
              <Text style={styles.locationActionText}>{locationOrigin ? 'Closest to me' : 'Newest first'}</Text>
              <Ionicons name={sortAnchor ? "chevron-up" : "chevron-down"} size={13} color="#2F7D32" />
            </TouchableOpacity>
          </View>
          {sort === 'closest' && locationState === 'denied' ? <TouchableOpacity accessibilityRole="button" onPress={() => Linking.openSettings().catch(() => Alert.alert('Location settings', 'Allow location access in your device settings.'))} style={styles.locationAction}><Text style={styles.locationActionText}>Allow location in Settings</Text></TouchableOpacity> : null}
          {sort === 'closest' && !origin ? <Text style={styles.helper}>{locationState === 'loading' ? 'Finding your location…' : 'Location unavailable. Showing newest first.'}</Text> : null}
        </View>


      </View>

      {error && reports.length > 0 ? <Text style={styles.error}>{error}</Text> : null}

      <ReportList
        reports={nearbyReports}
        selectedId={selectedMapReportId}
        origin={locationOrigin}
        onReportPress={handleReportPress}
        refreshing={refreshing}
        initialLoading={reportsLoading}
        onRefresh={() => { if (sort === 'closest') refreshLocation(); refreshReports({ showRefresh: true }); }}
        emptyAction={error ? { label: 'Try again', onPress: () => refreshReports({ showRefresh: true }) } : Object.keys(DEFAULT_REPORT_FILTERS).some(key => filters[key] !== DEFAULT_REPORT_FILTERS[key]) ? { label: 'Clear filters', onPress: () => setFilters({ ...DEFAULT_REPORT_FILTERS }) } : { label: 'Explore the map', onPress: () => navigation.navigate('Map') }}
        emptyTitle={error ? 'Reports unavailable' : 'No reports in this area'}
        emptyMessage={error
          ? 'Check your connection, then pull down to try again.'
          : 'Try changing your filters or exploring another area on the map.'}
        contentContainerStyle={{
          paddingBottom: getBottomNavClearance(insets.bottom) + 12,
        }}
        style={styles.list}
      />
      <Modal visible={!!sortAnchor} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSortAnchor(null)}>
        <View style={styles.menuOverlay} accessibilityViewIsModal onAccessibilityEscape={() => setSortAnchor(null)}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSortAnchor(null)} accessibilityRole="button" accessibilityLabel="Close sort menu" />
          <View style={[styles.sortMenu, sortAnchor || lastSortAnchor.current]}>
            <Text style={styles.sortMenuLabel} accessibilityRole="header">Sort reports</Text>
            {[
              { value: 'newest', label: 'Newest first', icon: 'time-outline' },
              { value: 'closest', label: 'Closest to me', icon: 'navigate-outline' },
            ].map(option => (
              <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityState={{ checked: sort === option.value }} onPress={() => selectSort(option.value)} style={[styles.sortOption, sort === option.value && styles.sortOptionSelected]}>
                <Ionicons name={option.icon} size={19} color={sort === option.value ? '#2F7D32' : '#657169'} />
                <Text style={[styles.sortOptionText, sort === option.value && styles.sortOptionTextSelected]}>{option.label}</Text>
                {sort === option.value ? <Ionicons name="checkmark" size={19} color="#2F7D32" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>



    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  summary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  summaryArea: { flexGrow: 1, flexShrink: 1 },
  sortButton: { minHeight: 44, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E4EAE5', flexDirection: 'row', alignItems: 'center', gap: 5 },
  sortButtonOpen: { backgroundColor: '#F0F6F0', borderColor: '#BED5BE' },
  menuOverlay: { flex: 1 },
  sortMenu: { position: 'absolute', width: 232, padding: 6, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4EAE5', shadowColor: '#17251A', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 12 },
  sortMenuLabel: { color: '#768078', fontSize: 12, fontWeight: '500', paddingHorizontal: 10, paddingTop: 6, paddingBottom: 8 },
  sortOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 9 },
  sortOptionSelected: { backgroundColor: '#EFF6EF' },
  sortOptionText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#303B34', fontWeight: '500' },
  sortOptionTextSelected: { color: '#2F7D32', fontWeight: '600' },
  summaryCopy: {
    flex: 1,
  },
  count: {
    color: '#171A1D',
    fontSize: 18,
    fontWeight: '600',
  },
  helper: {
    flex: 1,
    color: '#727A80',
    fontSize: 14,
  },
  area: { color: '#687178', fontSize: 12, marginTop: 4 },
  locationAction: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  locationActionText: { color: '#2F7D32', fontSize: 13, fontWeight: '600' },
  helperRow: { minHeight: 24, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 7 },
  error: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    color: '#B42318',
    fontSize: 14,
  },
  list: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDE1E3',
  },
});
