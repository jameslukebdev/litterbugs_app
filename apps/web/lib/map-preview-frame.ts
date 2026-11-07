/** Shared geography for the homepage snapshot and the main Map entry. */
export const BOONE_PREVIEW = {
  place: 'Boone', image: '/map-preview/boone.webp', zoom: 14,
  left: 1145002, top: 1643342, width: 1600, height: 1100,
  pinTop: 1643572, pinHeight: 640,
} as const;

const longitudeAt = (x: number) => x / (256 * 2 ** BOONE_PREVIEW.zoom) * 360 - 180;
const latitudeAt = (y: number) => 180 / Math.PI * Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / (256 * 2 ** BOONE_PREVIEW.zoom)));

export const BOONE_MAP_BOUNDS = {
  west: longitudeAt(BOONE_PREVIEW.left), east: longitudeAt(BOONE_PREVIEW.left + BOONE_PREVIEW.width),
  north: latitudeAt(BOONE_PREVIEW.pinTop), south: latitudeAt(BOONE_PREVIEW.pinTop + BOONE_PREVIEW.pinHeight),
};
export const BOONE_MAP_CENTER = {
  latitude: latitudeAt(BOONE_PREVIEW.pinTop + BOONE_PREVIEW.pinHeight / 2),
  longitude: longitudeAt(BOONE_PREVIEW.left + BOONE_PREVIEW.width / 2),
};
