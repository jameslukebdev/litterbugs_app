// The fixed choices offered in the report form (moved out of MapScreen unchanged).

export const REPORT_STEPS = Object.freeze(['Photos', 'Type of litter', 'Severity', 'Site conditions', 'Review']);

// Kinds of litter a reporter can tick.
export const LITTER_OPTIONS = Object.freeze([
  { label: 'Takeout cups', icon: 'cafe-outline' },
  { label: 'Bottles', icon: 'water-outline' },
  { label: 'Cans', icon: 'beer-outline' },
  { label: 'Paper products', icon: 'document-text-outline' },
  { label: 'Food wrappers', icon: 'fast-food-outline' },
  { label: 'Fast food bags', icon: 'bag-handle-outline' },
  { label: 'Plastic bags', icon: 'bag-handle-outline' },
  { label: 'Trash bags', icon: 'trash-outline' },
  { label: 'PPE', icon: 'medkit-outline' },
  { label: 'Construction debris', icon: 'construct-outline' },
  { label: 'Furniture', icon: 'bed-outline' },
  { label: 'Strewn plastic', icon: 'layers-outline' },
  { label: 'Textiles', icon: 'shirt-outline' },
  { label: 'Pet waste', icon: 'paw-outline' },
  { label: 'Tires', icon: 'disc-outline' },
  { label: 'Vehicular debris', icon: 'car-outline' },
]);

// Site conditions a reporter can tick.
export const NOTES_OPTIONS = Object.freeze([
  { label: 'Scattered',        icon: 'layers-outline' },
  { label: 'In a pile',        icon: 'construct-outline' },
  { label: 'Bagged but left',  icon: 'bag-handle-outline' },
  { label: 'Near roadside',    icon: 'car-outline' },
  { label: 'In Public Park',   icon: 'paw-outline' },
  { label: 'In ditch',         icon: 'water-outline' },
  { label: 'Along trail',      icon: 'walk-outline' },
  { label: 'Near waterway',    icon: 'water-outline' },
  { label: 'Blocking path',    icon: 'close-circle-outline' },
  { label: 'Broken glass',     icon: 'alert-circle-outline' },
  { label: 'Hard to access',   icon: 'warning-outline' },
  { label: 'Use Caution',      icon: 'warning-outline' },
]);
