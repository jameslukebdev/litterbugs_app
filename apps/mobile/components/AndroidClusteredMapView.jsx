import { forwardRef, useEffect, useRef } from 'react';
import ClusteredMapView from 'react-native-map-clustering';
import { mapRegionsAreEquivalent } from '../lib/responsiveLocation';

// Google Maps owns camera movement. Feeding each native settled region straight
// back into its controlled `region` prop can start another move after a swipe.
// Only an external request (search, location, deep link) should move it again.
const AndroidClusteredMapView = forwardRef(function AndroidClusteredMapView(
  { region, initialRegion, onRegionChangeComplete, ...props }, ref
) {
  const nativeRegion = useRef(region);

  useEffect(() => {
    if (!region || mapRegionsAreEquivalent(nativeRegion.current, region)) return;
    ref.current?.animateToRegion?.(region, 240);
  }, [region, ref]);

  return (
    <ClusteredMapView
      {...props}
      ref={ref}
      initialRegion={initialRegion ?? region}
      moveOnMarkerPress={false}
      onRegionChangeComplete={(nextRegion, ...details) => {
        nativeRegion.current = nextRegion;
        onRegionChangeComplete?.(nextRegion, ...details);
      }}
    />
  );
});

export default AndroidClusteredMapView;
