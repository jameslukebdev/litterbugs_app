import { colors } from './theme';
export const BOTTOM_NAV_METRICS = Object.freeze({
  height: 64,
  radius: 28,
  horizontalInset: 18,
  bottomGap: 10,
  minimumSafeInset: 8,
  maximumWidth: 420,
  contentClearance: 12,
  mapControlGap: 14,
  mapControlSize: 50,
});

export const BOTTOM_NAV_COLORS = Object.freeze({
  active: colors.primary,
  inactive: colors.body,
  surface: colors.white,
  activeSurface: colors.primarySoft,
  border: 'rgba(81, 70, 237, 0.16)',
});

export function getBottomNavBottom(safeAreaBottom = 0) {
  return Math.max(safeAreaBottom, BOTTOM_NAV_METRICS.minimumSafeInset)
    + BOTTOM_NAV_METRICS.bottomGap;
}

export function getBottomNavClearance(safeAreaBottom = 0) {
  return getBottomNavBottom(safeAreaBottom)
    + BOTTOM_NAV_METRICS.height
    + BOTTOM_NAV_METRICS.contentClearance;
}
