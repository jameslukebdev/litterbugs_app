// Where the map goes when a group is tapped: centred on the group's reports, close enough that
// the group splits apart and its pins spread over the middle of the screen, never so close that
// they reach the screen's edges or the map zooms past the point where every pin is on its own.

const FILL_WIDTH = 0.6; // the group's reports spread over the middle 60% of the width...
const FILL_HEIGHT = 0.5; // ...and 50% of the height, clear of the search bar and buttons
const MARGIN = 0.96; // a touch closer than the exact split, so the map's own rounding cannot undo it

/**
 * @param leaves the group's reports (supercluster leaf features)
 * @param splitZoom the clustering zoom at which the group splits (getClusterExpansionZoom)
 * @param closestZoom the clustering zoom at which every report is its own pin
 * @param currentRegion the map's current view (sets the shape of the new one)
 * @param zoomOf the map's own sum for the clustering zoom of a view
 */
export function regionForGroup({ leaves, splitZoom, closestZoom, currentRegion, zoomOf }) {
  const lats = leaves.map(leaf => leaf.geometry.coordinates[1]);
  const lngs = leaves.map(leaf => leaf.geometry.coordinates[0]);
  const center = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
  const at = scale => ({
    ...center,
    latitudeDelta: currentRegion.latitudeDelta * scale,
    longitudeDelta: currentRegion.longitudeDelta * scale,
  });
  // The widest view (as a fraction of the current one) whose clustering zoom reaches `zoom`.
  const widestReaching = (zoom) => {
    if (zoomOf(at(1)) >= zoom) return 1;
    let wide = 1;
    let close = 1 / 4096;
    if (zoomOf(at(close)) < zoom) return close;
    for (let step = 0; step < 40; step += 1) {
      const middle = (wide + close) / 2;
      if (zoomOf(at(middle)) >= zoom) close = middle; else wide = middle;
    }
    return close;
  };

  const split = Math.min(1, widestReaching(splitZoom) * MARGIN);
  const closest = widestReaching(closestZoom);
  const fill = Math.max(
    (Math.max(...lats) - Math.min(...lats)) / (currentRegion.latitudeDelta * FILL_HEIGHT),
    (Math.max(...lngs) - Math.min(...lngs)) / (currentRegion.longitudeDelta * FILL_WIDTH),
  );
  // Close enough to split the group; within that, spread its pins over the middle of the screen,
  // but no closer than where every pin already stands alone (reports at one spot never spread).
  return at(Math.min(split, Math.max(fill, closest)));
}
