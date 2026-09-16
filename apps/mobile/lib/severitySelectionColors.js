export const SEVERITY_SELECTION_COLORS = Object.freeze([
  Object.freeze({
    backgroundColor: '#FDEBED',
    borderColor: '#F3A8AE',
    foregroundColor: '#982D38',
    secondaryColor: '#A95059',
  }),
  Object.freeze({
    backgroundColor: '#DF626A',
    borderColor: '#C94750',
    foregroundColor: '#FFFFFF',
    secondaryColor: '#FFF2F3',
  }),
  Object.freeze({
    backgroundColor: '#991F2B',
    borderColor: '#731720',
    foregroundColor: '#FFFFFF',
    secondaryColor: '#FCE8EA',
  }),
]);

export function getSeveritySelectionColors(severityIndex) {
  const normalizedIndex = Math.max(0, Math.min(
    SEVERITY_SELECTION_COLORS.length - 1,
    Math.floor(Number(severityIndex) || 0)
  ));
  return SEVERITY_SELECTION_COLORS[normalizedIndex];
}
