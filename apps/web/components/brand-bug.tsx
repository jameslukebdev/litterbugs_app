/* eslint-disable @next/next/no-img-element -- tiny decorative brand marks; next/image adds no value at 16–40px. */
/** The four Litterbugs logo characters, cut from the logo, for use as small decorative icons. */
export type BrandBugKind = 'bee' | 'butterfly' | 'ladybug' | 'flower';

const SIZES: Record<BrandBugKind, [number, number]> = { bee: [101, 97], butterfly: [99, 98], ladybug: [71, 78], flower: [65, 63] };

export function BrandBug({ kind, size = 24, className }: { kind: BrandBugKind; size?: number; className?: string }) {
  const [w, h] = SIZES[kind];
  const scale = size / Math.max(w, h);
  return <img src={`/brand/bugs/${kind}.png`} alt="" aria-hidden="true" width={Math.round(w * scale)} height={Math.round(h * scale)} className={className} decoding="async" draggable={false} />;
}
