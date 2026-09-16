export const LITTER_SELECTION_COLORS = Object.freeze([
  Object.freeze({ backgroundColor: '#EAF4EC', borderColor: '#7DBD83', foregroundColor: '#245F2A' }),
  Object.freeze({ backgroundColor: '#F5E8F8', borderColor: '#D38AE2', foregroundColor: '#87309A' }),
  Object.freeze({ backgroundColor: '#FFF4CF', borderColor: '#F4CF61', foregroundColor: '#765400' }),
  Object.freeze({ backgroundColor: '#FBE8E8', borderColor: '#EE9292', foregroundColor: '#A52C2C' }),
  Object.freeze({ backgroundColor: '#E9EAFF', borderColor: '#8B90FF', foregroundColor: '#3037C7' }),
]);

export function getLitterSelectionColors(optionIndex) {
  const normalizedIndex = Math.max(0, Math.floor(Number(optionIndex) || 0));
  return LITTER_SELECTION_COLORS[normalizedIndex % LITTER_SELECTION_COLORS.length];
}
