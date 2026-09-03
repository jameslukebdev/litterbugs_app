import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReportList from './ReportList';
import { getBottomNavClearance } from './lib/navigationLayout';
import { getDistanceMiles, useReports } from './lib/reports';
import { findResponsiveUserLocation } from './lib/responsiveLocation';

const FILTERS = ['All', 'High', 'Medium', 'Low'];
const FILTER_COLORS = Object.freeze({
  High: '#E53935',
  Medium: '#F57C00',
  Low: '#43A047',
});

export default function ReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [locationOrigin, setLocationOrigin] = useState(null);
  const [locationState, setLocationState] = useState('loading');
  const {
    reports,
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

  const filteredReports = useMemo(() => {
    return filter === 'All'
      ? nearbyReports
      : nearbyReports.filter(
        ({ severity }) => String(severity).toLowerCase() === filter.toLowerCase()
      );
  }, [filter, nearbyReports]);

  const helperText = locationState === 'ready'
    ? 'Closest to your current location'
    : locationState === 'loading'
      ? 'Newest reports while we check your location…'
      : 'Most recent reports · enable location to sort by distance';

  const handleReportPress = (report) => {
    navigation.navigate('Map', { reportId: report.id });
  };

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryCopy}>
          <Text style={styles.count} accessibilityLiveRegion="polite">
            {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
          </Text>
          <View style={styles.helperRow}>
            {locationState === 'loading' ? <ActivityIndicator size="small" color="#2F7D32" /> : null}
            <Text style={styles.helper}>{helperText}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterOpen(true)}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={filter === 'All' ? 'Filter reports' : `Filter reports, ${filter} selected`}
          accessibilityHint="Opens report filter choices"
        >
          <Ionicons name="options-outline" size={19} color="#4C565D" />
          <Text style={styles.filterButtonText}>Filters</Text>
          {filter !== 'All' ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>1</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {error && reports.length > 0 ? <Text style={styles.error}>{error}</Text> : null}

      <ReportList
        reports={filteredReports}
        origin={locationOrigin}
        onReportPress={handleReportPress}
        refreshing={refreshing}
        initialLoading={reportsLoading}
        onRefresh={() => refreshReports({ showRefresh: true })}
        emptyTitle={error ? 'Reports unavailable' : 'No reports nearby'}
        emptyMessage={error
          ? 'Check your connection, then pull down to try again.'
          : 'No active reports are visible in this area.'}
        contentContainerStyle={{
          paddingBottom: getBottomNavClearance(insets.bottom) + 12,
        }}
        style={styles.list}
      />

      <Modal
        visible={filterOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={styles.filterBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            accessible={false}
            onPress={() => setFilterOpen(false)}
          />

          <View style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
            <View style={styles.filterHandle} />
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle} accessibilityRole="header">
                Filter reports
              </Text>
              <TouchableOpacity
                style={styles.filterClose}
                onPress={() => setFilterOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close filters"
              >
                <Text style={styles.filterCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionLabel}>Severity</Text>

            {FILTERS.map((item) => {
              const selected = filter === item;
              const color = FILTER_COLORS[item] ?? '#2F7D32';

              return (
                <TouchableOpacity
                  key={item}
                  style={styles.filterRow}
                  onPress={() => {
                    setFilter(item);
                    setFilterOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={item === 'All' ? 'All severities' : `${item} severity`}
                >
                  <View style={[styles.filterSeverityDot, { backgroundColor: color }]} />
                  <Text style={styles.filterRowText}>
                    {item === 'All' ? 'All severities' : `${item} severity`}
                  </Text>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
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
  filterButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#C8CDD1',
    backgroundColor: '#FFFFFF',
  },
  filterButtonText: {
    color: '#30373C',
    fontSize: 15,
    fontWeight: '800',
  },
  filterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F7D32',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
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
  filterBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  filterSheet: {
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#FFFFFF',
  },
  filterHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    backgroundColor: '#C9CDD0',
  },
  filterHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: {
    color: '#171A1D',
    fontSize: 24,
    fontWeight: '800',
  },
  filterClose: {
    minWidth: 52,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  filterCloseText: {
    color: '#2F7D32',
    fontSize: 15,
    fontWeight: '800',
  },
  filterSectionLabel: {
    paddingTop: 4,
    paddingBottom: 8,
    color: '#6B7379',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E3E5',
  },
  filterSeverityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  filterRowText: {
    flex: 1,
    marginLeft: 12,
    color: '#252A2E',
    fontSize: 16,
    fontWeight: '600',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BCC2C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#2F7D32',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2F7D32',
  },
});
