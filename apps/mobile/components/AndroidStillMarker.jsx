import { useEffect, useRef, useState } from 'react';
import { Marker } from 'react-native-maps';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';

// An Android map pin. Android draws a pin from a still picture of it, and every time that
// picture is replaced (`redraw`, or `tracksViewChanges`) the map can show nothing for a frame:
// a blink. So a pin's picture is only ever drawn in its first moments, while it is still
// invisible, and never again; anything that changes its look is in its key, which puts a
// new pin in its place.
//
// Landing (the website's bug-land: fade in while dropping onto the spot) is played by the
// real pin itself, on Android's own animation thread: the `drop` command added to the map
// library (patches/react-native-maps+1.20.1.patch, MapMarker.drop). It changes only the pin's
// opacity and anchor, so the picture is not redrawn, the pin stays attached to the map (it
// moves with the map even mid-landing), and it stays smooth while JavaScript is busy loading
// reports. (iPhone plays the landing with a stand-in instead: components/PinLanding.jsx.)
//
// `hidden`: waiting to land (or to be revealed), so invisible.
// `drop`: { token, order } from lib/usePinLandings.js; a new token plays the landing,
//   `order` places it in the 60ms stagger. `dropHeight`: the pin's height in points.
const DropCommands = codegenNativeCommands({ supportedCommands: ['drop'] });
// The picture is drawn as soon as the pin is on the map and twice more while it is still
// invisible (bug images draw at once: BrandBug sets fadeDuration 0); the landing starts after.
const DRAW_AT_MS = [0, 40, 90];
const DRAWN_BY_MS = 100;
const DROP_MS = 520;
const STAGGER_MS = 60;
const LIFT = 20; // points above the spot at the start, as on the website
const OVERSHOOT = 2; // points below the spot at 70%, as on the website

export default function AndroidStillMarker({ hidden = false, drop, dropHeight = 43, children, tracksViewChanges: _tracking, ...props }) {
  const marker = useRef(null);
  const mountedAt = useRef(Date.now());
  // The last landing that has finished, so the opacity prop can return to 1 after it.
  const [landed, setLanded] = useState(null);

  useEffect(() => {
    const timers = DRAW_AT_MS.map(delay => setTimeout(() => marker.current?.redraw?.(), delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  const token = drop?.token;
  useEffect(() => {
    if (token == null) return undefined;
    const native = marker.current?.marker?.current;
    const delay = Math.max(0, mountedAt.current + DRAWN_BY_MS - Date.now()) + (drop?.order ?? 0) * STAGGER_MS;
    try {
      if (native) DropCommands.drop(native, delay, DROP_MS, LIFT / dropHeight, OVERSHOOT / dropHeight);
    } catch { /* A build without the command simply shows the pin when the landing time is up. */ }
    const done = setTimeout(() => setLanded(token), delay + DROP_MS + 80);
    return () => clearTimeout(done);
    // A new token is a new landing; `order` belongs to that token.
  }, [token]);

  // While a landing is pending or playing, the opacity prop stays 0: the native landing owns
  // the pin's opacity and ends fully visible, and a prop of 1 arriving first would flash it.
  const landing = token != null && landed !== token;
  return (
    <Marker {...props} ref={marker} opacity={hidden || landing ? 0 : 1} tracksViewChanges={false}>
      {children}
    </Marker>
  );
}
