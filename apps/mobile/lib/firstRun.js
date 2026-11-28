import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { colors } from './theme';

// The first-time experience after the welcome screen: a short tour of the map,
// shown once. People who installed before this existed have no stored stage and never
// see it unless they open Profile > How Litterbugs works.
const KEY = 'litterbugs.first-run.v1';
export const FIRST_RUN_START = 'start';
const STAGES = [FIRST_RUN_START];

// The three things you can do, in the order a spot goes through them. Each keeps the
// app's own bug and colour for that action: dragonfly + blue (Report Litter), bee +
// yellow (Fund), butterfly + lilac (Clean).
export const START_PATHS = Object.freeze([
  { key: 'report', bug: 'dragonfly', verb: 'Report it.', caption: 'Snap a photo of litter you see. It lands on the map for everyone.', title: 'Report litter', line: 'Snap a photo of litter you see.', fill: colors.reportSoft, edge: colors.reportEdge, ink: colors.reportInk, verbInk: colors.reportInk },
  { key: 'fund', bug: 'bee', verb: 'Fund it.', caption: 'Anyone can add a few dollars toward getting it cleaned up.', title: 'Fund a cleanup', line: 'Add money to get a spot cleaned.', fill: colors.yellowPale, edge: colors.yellowBorder, ink: colors.fundInk, verbInk: colors.yellow },
  { key: 'clean', bug: 'butterfly', verb: 'Clean it up.', caption: 'Clean the spot, send a photo, and its fund is yours.', title: 'Clean up and get paid', line: 'Pick a spot, clean it, earn its fund.', fill: colors.cleanFill, edge: colors.cleanEdge, ink: colors.cleanInk, verbInk: colors.plum },
]);

// The tour's four steps: the same three actions with the words that go beside the lit
// button, plus "tap a ladybug" between Report and Fund, because opening a spot is how
// you reach Fund and Clean.
const TOUR_WORDS = {
  report: 'See litter? Tap Report Litter, snap a photo, and it lands on the map.',
  fund: 'Fund adds money to this spot’s cleanup, so someone gets paid to clean it.',
  clean: 'Tap Clean, clean the spot and send a photo. The spot’s fund is yours.',
};
const SPOT_STEP = { key: 'spot', bug: 'ladybug', title: 'Tap a ladybug', tour: 'Each ladybug on the map is a spot that needs a cleanup. Tap one to open it.', fill: colors.redSoft, edge: colors.redBorder, ink: colors.needsCleanup };
const [reportStep, ...spotSteps] = START_PATHS.map(path => ({ ...path, tour: TOUR_WORDS[path.key] }));
export const TOUR_STEPS = Object.freeze([reportStep, SPOT_STEP, ...spotSteps]);

let stage; // undefined until read from storage
const listeners = new Set();

export async function loadFirstRunStage() {
  if (stage !== undefined) return stage;
  let stored = null;
  try { stored = await AsyncStorage.getItem(KEY); } catch { /* A storage failure only skips the tips. */ }
  if (stage === undefined) stage = STAGES.includes(stored) ? stored : null;
  return stage;
}

export function setFirstRunStage(next) {
  stage = STAGES.includes(next) ? next : null;
  listeners.forEach(listener => listener(stage));
  AsyncStorage.setItem(KEY, stage ?? 'done').catch(() => {});
}

/** [stage, setStage]: stage is null until loaded, and again once the first run is over. */
export function useFirstRunStage() {
  const [current, setCurrent] = useState(stage ?? null);
  useEffect(() => {
    let mounted = true;
    listeners.add(setCurrent);
    loadFirstRunStage().then(value => { if (mounted) setCurrent(value); });
    return () => { mounted = false; listeners.delete(setCurrent); };
  }, []);
  return [current, setFirstRunStage];
}
