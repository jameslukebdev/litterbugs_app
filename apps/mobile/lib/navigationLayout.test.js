import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  BOTTOM_NAV_METRICS,
  getBottomNavBottom,
  getBottomNavClearance,
} from './navigationLayout';

const floatingTabBarSource = readFileSync(
  new URL('../FloatingBottomTabBar.js', import.meta.url),
  'utf8',
);

describe('floating bottom navigation layout', () => {
  it('floats above the safe area with content clearance', () => {
    expect(getBottomNavBottom(34)).toBe(44);
    expect(getBottomNavClearance(34)).toBe(
      44 + BOTTOM_NAV_METRICS.height + BOTTOM_NAV_METRICS.contentClearance,
    );
  });

  it('retains a minimum gap on devices without a home indicator', () => {
    expect(getBottomNavBottom(0)).toBe(
      BOTTOM_NAV_METRICS.minimumSafeInset + BOTTOM_NAV_METRICS.bottomGap,
    );
  });

  it('uses a rounded, inset pill with a selected-tab surface', () => {
    expect(BOTTOM_NAV_METRICS.horizontalInset).toBeGreaterThan(0);
    expect(BOTTOM_NAV_METRICS.radius).toBeGreaterThan(0);
    expect(Number.isFinite(BOTTOM_NAV_METRICS.maximumWidth)).toBe(true);
    expect(floatingTabBarSource).toContain('styles.barDock');
    expect(floatingTabBarSource).toContain('styles.tabContentSelected');
    expect(floatingTabBarSource).toContain("boxShadow: '0 8px 24px rgba(31, 35, 40, 0.18)'");
  });
});
