import { communityResources } from './community-resources';
import { booneGuidance, booneGuidanceReviewedAt } from './boone-cleanup-guidance';

/**
 * Reviewed local help for a community page, named by what someone wants to do. Only Boone has reviewed
 * groups so far; other communities don't show the section. Descriptions shorten the reviewed
 * descriptions in community-resources.ts; links are the same official pages.
 */
export type HelpIcon = 'group' | 'street' | 'stream' | 'road' | 'dropoff';
export type HelpCard = { need: string; icon: HelpIcon; who: string; detail: string; href: string; resourceId: string };
export type GuideQuestion = { question: string; paragraphs: string[]; links: { label: string; href: string }[] };

const BOONE_CARDS: Omit<HelpCard, 'href'>[] = [
  { resourceId: 'mountaintrue', need: 'Join a group cleanup', icon: 'group', who: 'MountainTrue', detail: 'Volunteer events across the High Country' },
  { resourceId: 'adopt-a-street', need: 'Adopt a street', icon: 'street', who: 'Town of Boone', detail: 'Free bags, gloves and vests for a year of pickups' },
  { resourceId: 'adopt-a-stream', need: 'Adopt a stream', icon: 'stream', who: 'Town of Boone', detail: 'Two cleanups a year; the town collects the debris' },
  { resourceId: 'ncdot-litter', need: 'Clean a state road', icon: 'road', who: 'NCDOT, through the county', detail: 'Supplies from the county maintenance office' },
  { resourceId: 'watauga-disposal', need: 'Drop off what you collect', icon: 'dropoff', who: 'Watauga County', detail: 'Transfer station, 336 Landfill Road' },
];

export function communityHelp(slug: string): { cards: HelpCard[]; guide: GuideQuestion[]; reviewedAt: string | null } {
  if (slug !== 'us-nc-boone') return { cards: [], guide: [], reviewedAt: null };
  const cards = BOONE_CARDS.flatMap(card => {
    const resource = communityResources.find(item => item.id === card.resourceId);
    return resource ? [{ ...card, href: resource.href }] : [];
  });
  return { cards, guide: booneGuidance, reviewedAt: booneGuidanceReviewedAt };
}
