/* eslint-disable @next/next/no-img-element -- tiny decorative brand marks, like BrandBug. */
import { BrandBug } from '@/components/brand-bug';
import type { MapPreviewPin } from '@/lib/map-preview';

/**
 * One bug per map state, used on pins, cards and the map key:
 * ladybug = needs a cleanup, caterpillar = being cleaned up, flower = cleaned up.
 */
export function MapPinBug({ kind, size = 20 }: { kind: MapPreviewPin['kind']; size?: number }) {
  if (kind === 'busy') return <img src="/brand/ranks/caterpillar.svg" alt="" aria-hidden="true" width={size + 2} height={size + 2} decoding="async" draggable={false} />;
  return <BrandBug kind={kind === 'done' ? 'flower' : 'ladybug'} size={kind === 'done' ? size - 2 : size} />;
}
