import {
  IoCafeOutline, IoWaterOutline, IoBeerOutline, IoDocumentTextOutline,
  IoFastFoodOutline, IoBagHandleOutline, IoTrashOutline, IoMedkitOutline,
  IoConstructOutline, IoBedOutline, IoLayersOutline, IoShirtOutline,
  IoPawOutline, IoDiscOutline, IoCarOutline, IoWalkOutline,
  IoCloseCircleOutline, IoAlertCircleOutline, IoWarningOutline, IoCreateOutline,
} from 'react-icons/io5';

// Keep the same pictograms as the app's reportOptionIcons mapping.
const icons = {
  'Takeout cups': IoCafeOutline, Bottles: IoWaterOutline, Cans: IoBeerOutline,
  'Paper products': IoDocumentTextOutline, 'Food wrappers': IoFastFoodOutline,
  'Fast food bags': IoBagHandleOutline, 'Plastic bags': IoBagHandleOutline,
  'Trash bags': IoTrashOutline, PPE: IoMedkitOutline,
  'Construction debris': IoConstructOutline, Furniture: IoBedOutline,
  'Strewn plastic': IoLayersOutline, Textiles: IoShirtOutline,
  'Pet waste': IoPawOutline, Tires: IoDiscOutline, 'Vehicular debris': IoCarOutline,
  Scattered: IoLayersOutline, 'In a pile': IoConstructOutline,
  'Bagged but left': IoBagHandleOutline, 'Near roadside': IoCarOutline,
  'In Public Park': IoPawOutline, 'In ditch': IoWaterOutline,
  'Along trail': IoWalkOutline, 'Near waterway': IoWaterOutline,
  'Blocking path': IoCloseCircleOutline, 'Broken glass': IoAlertCircleOutline,
  'Hard to access': IoWarningOutline, 'Use Caution': IoWarningOutline,
};
export function ReportOptionIcon({ label }: { label: string }) {
  const OptionIcon = icons[label as keyof typeof icons] ?? IoCreateOutline;
  return <OptionIcon aria-hidden="true" />;
}
export function reportOptionLabel(label: string) {
  return label === 'In Public Park' ? 'In public park' : label === 'Use Caution' ? 'Use caution' : label;
}
