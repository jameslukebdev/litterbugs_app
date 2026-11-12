// Where a tapped pin sits: about a third of the way down the screen, in the open map between the
// search bar and the report card (the card covers the middle of the screen).
export const SELECTED_PIN_HEIGHT = 0.3;

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
