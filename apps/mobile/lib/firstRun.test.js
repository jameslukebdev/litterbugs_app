import { afterEach, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn().mockResolvedValue() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
import { START_PATHS, TOUR_STEPS, loadFirstRunStage, setFirstRunStage } from './firstRun';
afterEach(() => vi.clearAllMocks());

it('shows nothing to people who never went through the new welcome', async () => {
  storage.getItem.mockResolvedValue(null);
  expect(await loadFirstRunStage()).toBe(null);
});
it('remembers that the tour is due and ends the first run for good', async () => {
  setFirstRunStage('start');
  expect(await loadFirstRunStage()).toBe('start');
  expect(storage.setItem).toHaveBeenCalledWith('litterbugs.first-run.v1', 'start');
  setFirstRunStage(null);
  expect(await loadFirstRunStage()).toBe(null);
  expect(storage.setItem).toHaveBeenLastCalledWith('litterbugs.first-run.v1', 'done');
});
it('keeps each action on its own bug: dragonfly reports, bee funds, butterfly cleans', () => {
  expect(START_PATHS.map(path => [path.key, path.bug])).toEqual([['report', 'dragonfly'], ['fund', 'bee'], ['clean', 'butterfly']]);
});
it('walks through report, opening a spot, fund and clean in that order, naming each button as the app does', () => {
  expect(TOUR_STEPS.map(step => step.key)).toEqual(['report', 'spot', 'fund', 'clean']);
  expect(TOUR_STEPS[0].tour).toContain('Report Litter');
  expect(TOUR_STEPS[1]).toMatchObject({ bug: 'ladybug', title: 'Tap a ladybug' });
  expect(TOUR_STEPS[2].tour).toContain('Fund');
  expect(TOUR_STEPS[3].tour).toContain('Clean');
});
