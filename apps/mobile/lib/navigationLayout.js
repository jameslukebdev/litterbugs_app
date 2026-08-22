export const BOTTOM_NAV_METRICS = Object.freeze({
  height: 56,
  radius: 0,
  horizontalInset: 0,
  bottomGap: 0,
  minimumSafeInset: 8,
  maximumWidth: Number.POSITIVE_INFINITY,
  contentClearance: 8,
  mapControlGap: 14,
  mapControlSize: 56,
});

export const BOTTOM_NAV_COLORS = Object.freeze({
  active: '#2F7D32',
  inactive: '#4B5563',
  selectedBackground: '#EAF5EA',
  surface: '#FFFFFF',
  border: 'rgba(0,0,0,0.14)',
});

export function getBottomNavBottom(safeAreaBottom = 0) {
  return 0;
}

export function getBottomNavClearance(safeAreaBottom = 0) {
  return Math.max(safeAreaBottom, BOTTOM_NAV_METRICS.minimumSafeInset)
    + BOTTOM_NAV_METRICS.height
    + BOTTOM_NAV_METRICS.contentClearance;
}
