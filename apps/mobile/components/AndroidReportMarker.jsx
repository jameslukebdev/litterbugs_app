import { cloneElement, useCallback, useEffect, useRef } from 'react';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { loadAsync } from 'expo-font';

let iconFont;
const loadMarkerFont = () => (iconFont ??= loadAsync(Ionicons.font));

// Android markers are bitmap snapshots. Refresh changed artwork after native
// layout instead of recapturing every report on every tracker tick while panning.
export default function AndroidReportMarker({ snapshotKey, children, tracksViewChanges: _tracking, ...props }) {
  const marker = useRef(null);
  const frame = useRef(null);
  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  const redraw = useCallback(() => {
    cancel();
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        marker.current?.redraw();
      });
    });
  }, [cancel]);

  useEffect(() => {
    redraw();
    return cancel;
  }, [snapshotKey, redraw, cancel]);
  useEffect(() => {
    let active = true;
    loadMarkerFont().then(() => { if (active) redraw(); }).catch(() => {});
    return () => { active = false; cancel(); };
  }, [redraw, cancel]);

  return <Marker {...props} ref={marker} tracksViewChanges={false}>
    {cloneElement(children, { onLayout: redraw })}
  </Marker>;
}
