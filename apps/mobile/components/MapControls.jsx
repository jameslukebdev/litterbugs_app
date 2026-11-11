import { ActivityIndicator, Animated, Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BOTTOM_NAV_METRICS } from '../lib/navigationLayout';
import { colors } from '../lib/theme';
import styles from '../styles/MapScreen.styles';

// The controls that float over the map: the report pin while choosing a location,
// the Report Litter / Use this location button with its cancel button, and the
// centre-on-me and map-style buttons. Layout moved out of MapScreen unchanged.
export default function MapControls(props) {
  const {
    cancelReportLocationPicker,
    centerOnUser,
    clearSearchPlace,
    confirmReportLocation,
    detailsOpen,
    fontScale,
    formOpen,
    isCentering,
    isCheckingReportLocation,
    isLocatingReportLocation,
    isSaving,
    mapControlsBottom,
    mapType,
    openReportLocationPicker,
    previewControlsHidden,
    reportControlTransition,
    reportControlWidth,
    reportPlacementActive,
    showInitialMapLoading,
    toggleMapType,
  } = props;

  return (
    <>
      {reportPlacementActive ? (
        <View
          style={styles.reportPlacementPinArea}
          pointerEvents="none"
          accessible={false}
        >
          <Ionicons name="location-sharp" size={54} color={colors.primaryDark} style={{ transform: [{ translateY: -24 }] }} />
          <View style={{ position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.white }} />
        </View>
      ) : null}



      <View
        style={[styles.reportLitterButtonDock, { bottom: mapControlsBottom }, previewControlsHidden && !reportPlacementActive && { display: 'none' }]}
        pointerEvents="box-none"
      >
        <Animated.View
          pointerEvents={reportPlacementActive ? 'auto' : 'none'}
          style={[
            styles.reportPlacementCloseWrap,
            fontScale > 1.5
              ? { left: 16, bottom: 90 * fontScale }
              : { right: reportControlWidth + 26 },
            {
              opacity: reportControlTransition,
              transform: [
                {
                  translateX: reportControlTransition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
                {
                  scale: reportControlTransition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.82, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.reportPlacementClose}
            onPress={cancelReportLocationPicker}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Cancel report location"
            accessibilityHint="Closes the report pin and returns to normal map browsing"
          >
            <Ionicons name="close" size={27} color={colors.ink} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            transform: [
              {
                scale: reportControlTransition.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.97, 1],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={[styles.reportLitterButton, reportPlacementActive && !isCheckingReportLocation && { backgroundColor: colors.primary }, { width: reportControlWidth, height: fontScale > 1.5 ? undefined : BOTTOM_NAV_METRICS.mapControlSize, minHeight: 44, paddingVertical: fontScale > 1.5 ? 12 : 0 }]}
            onPress={reportPlacementActive ? confirmReportLocation : openReportLocationPicker}
            disabled={showInitialMapLoading || formOpen || detailsOpen || isSaving || isLocatingReportLocation || isCheckingReportLocation}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={isCheckingReportLocation ? 'Checking reporting distance' : isLocatingReportLocation ? 'Finding your location' : reportPlacementActive ? 'Use this location' : 'Report litter'}
            accessibilityHint={reportPlacementActive
              ? 'Checks that the pin is within 50 miles of your current GPS location'
              : 'Places a pin at the map center so you can choose the cleanup site'}
            accessibilityState={{
              busy: isLocatingReportLocation || isCheckingReportLocation,
              disabled: showInitialMapLoading || formOpen || detailsOpen || isSaving || isLocatingReportLocation || isCheckingReportLocation,
            }}
          >
              {isLocatingReportLocation || isCheckingReportLocation ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.reportLitterButtonText, { flexShrink: 1, textAlign: 'center' }]}>{isCheckingReportLocation ? 'Checking distance…' : 'Finding your location…'}</Text>
                </>
              ) : (
                <>
                  {/* Website: the dragonfly labels Report Litter; placing the pin turns it into the purple confirm button. */}
                  {reportPlacementActive ? null : <Image source={require('../assets/bugs/dragonfly.png')} style={{ width: 26, height: 26 }} resizeMode="contain" accessible={false} />}
                  <Text numberOfLines={fontScale > 1.5 ? undefined : 1} style={[styles.reportLitterButtonText, reportPlacementActive && { color: colors.white }, { flexShrink: 1, textAlign: 'center' }]}>{reportPlacementActive ? 'Use this location' : 'Report Litter'}</Text>
                </>
              )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Center Me Button */}
      {!previewControlsHidden ? <TouchableOpacity
        style={[
          styles.centerButton,
          {
            bottom: mapControlsBottom + (fontScale > 1.5 ? 90 * fontScale : 58),
          },
        ]}
        onPress={() => { clearSearchPlace(); centerOnUser(); }}
        disabled={isCentering}
        accessibilityRole="button"
        accessibilityLabel={isCentering ? 'Finding your location' : 'Center map on your location'}
        accessibilityState={{ busy: isCentering, disabled: isCentering }}
      >
        {isCentering ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Ionicons name="locate-outline" size={23} color={colors.ink} />
        )}
      </TouchableOpacity> : null}

      {!previewControlsHidden ? <TouchableOpacity
        style={[
          styles.mapTypeButton,
          {
            bottom: mapControlsBottom + (fontScale > 1.5 ? 90 * fontScale : 58) + BOTTOM_NAV_METRICS.mapControlSize + 10,
          },
        ]}
        onPress={toggleMapType}
        accessibilityRole="button"
        accessibilityLabel="Change map style"
        accessibilityValue={{ text: mapType }}
      >
        <Ionicons name="layers-outline" size={23} color={mapType === 'standard' ? colors.ink : colors.primary} />
      </TouchableOpacity> : null}
    </>
  );
}
