// The website's calm map look (its Google Maps cloud style), for Android's
// Google map: pale land, soft park greens, quiet roads and labels, and no
// business pins competing with report pins. iOS uses Apple's `mutedStandard`.
export const CALM_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f4f3ee' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6f6d78' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d6d3df' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e9efdf' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d3e6c4' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ saturation: -60 }, { lightness: 20 }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fbf7ee' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f6dcc0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#ecc9a3' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe3ef' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7a95a6' }] },
];
