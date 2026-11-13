// Keep the entire selected pin in the open map below search. At 30%, taller
// report previews cover its point and can hide the bug when switching reports.
export const SELECTED_PIN_HEIGHT = 0.22;

// Preserve the approved normal-screen framing, but keep the whole pin below
// search when a short window or larger text leaves less room at the top.
export function selectedPinPointY(mapHeight, topInset = 0, searchHeight = 48, markerHeight = 43) {
  return Math.max(SELECTED_PIN_HEIGHT * mapHeight, topInset + 10 + searchHeight + markerHeight + 12);
}

/**
 * The view, at the current zoom, that puts `coordinate` at `pointY` points down a map `mapHeight`
 * points tall, centred left to right. Map spans this small are near enough to straight lines.
 */
export function regionWithPointAt(region, coordinate, pointY, mapHeight) {
  const degreesPerPoint = region.latitudeDelta / mapHeight;
  return {
    ...region,
    latitude: coordinate.latitude - (mapHeight / 2 - pointY) * degreesPerPoint,
    longitude: coordinate.longitude,
  };
}
