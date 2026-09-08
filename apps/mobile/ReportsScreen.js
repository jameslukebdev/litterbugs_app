import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReportFilters from './components/ReportFilters';
import ReportList from './ReportList';
import { getBottomNavClearance } from './lib/navigationLayout';
import { getDistanceMiles, useReports } from './lib/reports';
import { findResponsiveUserLocation } from './lib/responsiveLocation';

export default function ReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [locationOrigin, setLocationOrigin] = useState(null);
  const [locationState, setLocationState] = useState('loading');
  const {
    filteredReports: reports,
    loading: reportsLoading,
    refreshing,
    refreshReports,
    error,
  } = useReports();

  useEffect(() => {
    let active = true;

    const loadLocation = async () => {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (permission.status === 'undetermined') {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (permission.status !== 'granted') {
          if (active) setLocationState('unavailable');
          return;
        }

        await findResponsiveUserLocation({
          locationApi: Location,
          onPosition: (location) => {
            if (!active) return;
            setLocationOrigin({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            setLocationState('ready');
          },
        });
      } catch (locationError) {
        if (active) setLocationState('unavailable');
      }
    };

    loadLocation();
    return () => { active = false; };
  }, []);

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

  const helperText = locationState === 'ready'
    ? 'Map area · closest to your current location'
    : locationState === 'loading'
      ? 'Newest reports while we check your location…'
      : 'Most recent reports · enable location to sort by distance';

  const handleReportPress = (report) => {
    navigation.navigate('Map', { reportId: report.id, returnTo: 'Reports' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryCopy}>
          <Text style={styles.count} accessibilityLiveRegion="polite">
            {nearbyReports.length} {nearbyReports.length === 1 ? 'report' : 'reports'}
          </Text>
          <View style={styles.helperRow}>
            {locationState === 'loading' ? <ActivityIndicator size="small" color="#2F7D32" /> : null}
            <Text style={styles.helper}>{helperText}</Text>
          </View>
        </View>


      </View>

      <ReportFilters />
      {error && reports.length > 0 ? <Text style={styles.error}>{error}</Text> : null}

      <ReportList
        reports={nearbyReports}
        origin={locationOrigin}
        onReportPress={handleReportPress}
        refreshing={refreshing}
        initialLoading={reportsLoading}
        onRefresh={() => refreshReports({ showRefresh: true })}
        emptyTitle={error ? 'Reports unavailable' : 'No reports nearby'}
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
    color: '#727A80',
    fontSize: 14,
  },
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
