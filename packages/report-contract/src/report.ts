import type { Report, ReportInsert, ReportUpdate } from './database.types';

export const REPORT_STEPS = [
  'Title',
  'Photos',
  'Litter Types',
  'Severity',
  'Notes',
  'Review',
] as const;

export const MAX_REPORT_DISTANCE_MILES = 10;
export const MAX_REPORT_PHOTOS = 3;
export const MAX_REPORT_TITLE_LENGTH = 80;
export const MAX_REPORT_NOTES_LENGTH = 500;
export const FALLBACK_MAP_CENTER = { latitude: 35.6009, longitude: -82.554 } as const;

export const LITTER_OPTIONS = [
  'Takeout cups',
  'Bottles',
  'Cans',
  'Paper products',
  'Food wrappers',
  'Fast food bags',
  'Plastic bags',
  'Trash bags',
  'PPE',
  'Construction debris',
  'Furniture',
  'Strewn plastic',
  'Textiles',
  'Pet waste',
  'Tires',
  'Vehicular debris',
] as const;

export const NOTE_OPTIONS = [
  'Scattered',
  'In a pile',
  'Bagged but left',
  'Near roadside',
  'In Public Park',
  'In ditch',
  'Along trail',
  'Near waterway',
  'Blocking path',
  'Broken glass',
  'Hard to access',
  'Use Caution',
] as const;

export const SEVERITY_LEVELS = ['Low', 'Medium', 'High'] as const;

export type Severity = (typeof SEVERITY_LEVELS)[number];
export type Coordinates = { latitude: number; longitude: number };
export type MappableReport = Report & { latitude: number; longitude: number };

export function hasReportCoordinates(report: Report): report is MappableReport {
  return typeof report.latitude === 'number' && typeof report.longitude === 'number';
}

export type ReportDraft = {
  title: string;
  selectedTypes: string[];
  types: string;
  photos: File[];
  severity: Severity | '';
  selectedNotes: string[];
  notes: string;
};

export const EMPTY_REPORT_DRAFT: ReportDraft = {
  title: '',
  selectedTypes: [],
  types: '',
  photos: [],
  severity: '',
  selectedNotes: [],
  notes: '',
};

export type ReportDraftErrors = Partial<Record<'types' | 'severity' | 'title' | 'notes', string>>;

export function validateReportDraft(draft: ReportDraft): ReportDraftErrors {
  const errors: ReportDraftErrors = {};

  if (!draft.selectedTypes.length && !draft.types.trim()) {
    errors.types = 'Select at least one litter type to continue.';
  }
  if (!draft.severity) {
    errors.severity = 'Choose a severity level to continue.';
  }
  if (draft.title.trim().length > MAX_REPORT_TITLE_LENGTH) {
    errors.title = `Use ${MAX_REPORT_TITLE_LENGTH} characters or fewer.`;
  }
  if (draft.notes.trim().length > MAX_REPORT_NOTES_LENGTH) {
    errors.notes = `Use ${MAX_REPORT_NOTES_LENGTH} characters or fewer.`;
  }

  return errors;
}

export function reportInsertFromDraft(
  draft: ReportDraft,
  coordinates: Coordinates,
  userId: string,
): ReportInsert {
  return {
    title: draft.title.trim() || 'Litter Report',
    litter_types: draft.selectedTypes.length ? draft.selectedTypes : null,
    types: draft.types.trim() || null,
    notes_presets: draft.selectedNotes.length ? draft.selectedNotes : null,
    notes_other: draft.notes.trim() || null,
    severity: draft.severity || null,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    user_id: userId,
  };
}

export function reportUpdateFromDraft(draft: ReportDraft): ReportUpdate {
  return {
    title: draft.title.trim() || 'Litter Report',
    litter_types: draft.selectedTypes.length ? draft.selectedTypes : null,
    types: draft.types.trim() || null,
    notes_presets: draft.selectedNotes.length ? draft.selectedNotes : null,
    notes_other: draft.notes.trim() || null,
    severity: draft.severity || null,
  };
}

export function getDistanceMiles(pointA: Coordinates, pointB: Coordinates): number {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const latitudeA = toRadians(pointA.latitude);
  const latitudeB = toRadians(pointB.latitude);
  const deltaLatitude = latitudeB - latitudeA;
  const deltaLongitude = toRadians(pointB.longitude) - toRadians(pointA.longitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function isWithinReportDistance(user: Coordinates, report: Coordinates): boolean {
  return getDistanceMiles(user, report) <= MAX_REPORT_DISTANCE_MILES;
}
