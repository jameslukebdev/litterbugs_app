// The website's map look on Android's Google map. The website uses the cloud map style
// "Litterbugs calm" (Google Cloud project litterbugs-auth, map ID "Litterbugs Web Map calm").
// Android cannot share that style without every map load becoming a billed Dynamic Maps
// load, so this is the same style written in Android's free style format. Keep the two in
// step: each line below names the website setting it copies. Anything the website leaves
// at Google's default is left at the default here too. iOS uses Apple's map (`mutedStandard`).
export const CALM_MAP_STYLE = [
  // infrastructure / natural / political labels: textFillColor #5f6f62, textStrokeColor #ffffff
  { elementType: 'labels.text.fill', stylers: [{ color: '#5f6f62' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  // natural.land: #e9f1e3; natural.land.landCover.forest: #cfe4c4
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e9f1e3' }] },
  { featureType: 'landscape.natural.landcover', elementType: 'geometry', stylers: [{ color: '#cfe4c4' }] },
  // natural.water: #cfe2ee
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe2ee' }] },
  // pointOfInterest labels hidden (business names and icons); pointOfInterest.recreation.park: #cbe2bf
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#cbe2bf' }] },
  // infrastructure.roadNetwork.road.arterial: #fbecd2
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#fbecd2' }] },
  // infrastructure.roadNetwork.road.highway: fill #f2cdb8, stroke #e3b59d
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#f2cdb8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e3b59d' }] },
  // infrastructure.railwayTrack labels hidden; infrastructure.transitStation hidden
  { featureType: 'transit.line', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
];
