const LITTER_TYPE_ICONS = Object.freeze({
  'Takeout cups': 'cafe-outline',
  Bottles: 'water-outline',
  Cans: 'beer-outline',
  'Paper products': 'document-text-outline',
  'Food wrappers': 'fast-food-outline',
  'Fast food bags': 'bag-handle-outline',
  'Plastic bags': 'bag-handle-outline',
  'Trash bags': 'trash-outline',
  PPE: 'medkit-outline',
  'Construction debris': 'construct-outline',
  Furniture: 'bed-outline',
  'Strewn plastic': 'layers-outline',
  Textiles: 'shirt-outline',
  'Pet waste': 'paw-outline',
  Tires: 'disc-outline',
  'Vehicular debris': 'car-outline',
});

const SITE_CONDITION_ICONS = Object.freeze({
  Scattered: 'layers-outline',
  'In a pile': 'construct-outline',
  'Bagged but left': 'bag-handle-outline',
  'Near roadside': 'car-outline',
  'In Public Park': 'paw-outline',
  'In ditch': 'water-outline',
  'Along trail': 'walk-outline',
  'Near waterway': 'water-outline',
  'Blocking path': 'close-circle-outline',
  'Broken glass': 'alert-circle-outline',
  'Hard to access': 'warning-outline',
  'Use Caution': 'warning-outline',
});

export function getLitterTypeIcon(type) {
  return LITTER_TYPE_ICONS[type] || 'create-outline';
}

export function getSiteConditionIcon(condition) {
  return SITE_CONDITION_ICONS[condition] || 'information-circle-outline';
}
