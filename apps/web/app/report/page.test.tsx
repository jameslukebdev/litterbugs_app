import { expect, it, vi } from 'vitest';
import Page from './page';
vi.mock('@/components/map-page', () => ({ default: () => null }));
it('opens the picker on the map for anyone, without an account redirect', async () => {
  const page = await Page();
  expect(page.props.initialView).toBe('map');
});
