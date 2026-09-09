import { DEFAULT_REPORT_FILTERS } from './lib/reportFilters';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReportFilters from './components/ReportFilters';
import ReportList from './ReportList';
import { getBottomNavClearance } from './lib/navigationLayout';
import { getDistanceMiles, useReports } from './lib/reports';
import useReportsLocation from './lib/useReportsLocation';
import { reportsLocationPresentation } from './lib/reportsLocation';

export default function ReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { origin: locationOrigin, status: locationState, refresh: refreshLocation } = useReportsLocation();
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

  const locationPresentation = reportsLocationPresentation(locationState);
  const areaText = searchPlace ? `${searchPlace.label} · ${searchPlace.geometry ? 'search area' : 'map area'}` : 'Map area';
  const handleLocationAction = async () => {
    if (locationState === 'denied') {
      try { await Linking.openSettings(); }
      catch { Alert.alert('Location settings', 'Open your device settings and allow location access for Litterbugs.'); }
    } else {
      refreshLocation({ requestPermission: locationState === 'permission-needed' });
    }
  };

  const handleReportPress = (report) => {
    setSelectedMapReportId(report.id);
    navigation.navigate('Map', { reportId: report.id, returnTo: 'Reports' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryCopy}>
          <Text style={styles.count} accessibilityLiveRegion="polite">
            {reportsLoading && reports.length === 0 ? 'Loading reports…' : `${nearbyReports.length} ${nearbyReports.length === 1 ? 'report' : 'reports'}`}
          </Text>
          <Text style={styles.area}>{areaText}</Text>
          <View style={styles.helperRow}>
            {locationState === 'loading' ? <ActivityIndicator size="small" color="#2F7D32" /> : null}
            <Text style={styles.helper}>{locationPresentation.text}</Text>
          </View>
          {locationPresentation.action ? <TouchableOpacity accessibilityRole="button" onPress={handleLocationAction} style={styles.locationAction}>
            <Text style={styles.locationActionText}>{locationPresentation.action}</Text>
          </TouchableOpacity> : null}
        </View>


      </View>

      <ReportFilters />
      {error && reports.length > 0 ? <Text style={styles.error}>{error}</Text> : null}

      <ReportList
        reports={nearbyReports}
        selectedId={selectedMapReportId}
        origin={locationOrigin}
        onReportPress={handleReportPress}
        refreshing={refreshing}
        initialLoading={reportsLoading}
        onRefresh={() => { refreshLocation(); refreshReports({ showRefresh: true }); }}
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


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  summary: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryCopy: {
    flex: 1,
  },
  count: {
    color: '#171A1D',
    fontSize: 28,
    fontWeight: '800',
  },
  helper: {
    flex: 1,
    color: '#727A80',
    fontSize: 14,
  },
  area: { color: '#515B61', fontSize: 14, marginTop: 4 },
  locationAction: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  locationActionText: { color: '#2F7D32', fontSize: 14, fontWeight: '700' },
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
