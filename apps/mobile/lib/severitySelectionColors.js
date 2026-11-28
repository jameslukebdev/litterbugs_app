// Website report form severity colours (apps/web components/report-wizard.module.css):
// green for Low, orange for Medium, red for High. The icon keeps its colour at rest;
// selecting a level adds its pale fill, edge and darker words.
export const SEVERITY_SELECTION_COLORS = Object.freeze([
  Object.freeze({
    backgroundColor: '#ECF6E3',
    borderColor: '#9FD17A',
    foregroundColor: '#2F6B3A',
    secondaryColor: '#2F6B3A',
    iconColor: '#77B847',
  }),
  Object.freeze({
    backgroundColor: '#FFF4DC',
    borderColor: '#F2A93B',
    foregroundColor: '#7A4A00',
    secondaryColor: '#7A4A00',
    iconColor: '#F2A93B',
  }),
  Object.freeze({
    backgroundColor: '#FFF0F1',
    borderColor: '#ED3F48',
    foregroundColor: '#A8323B',
    secondaryColor: '#A8323B',
    iconColor: '#ED3F48',
  }),
]);

export function getSeveritySelectionColors(severityIndex) {
  const normalizedIndex = Math.max(0, Math.min(
    SEVERITY_SELECTION_COLORS.length - 1,
    Math.floor(Number(severityIndex) || 0)
  ));
  return SEVERITY_SELECTION_COLORS[normalizedIndex];
}
