/* eslint-disable @next/next/no-img-element -- tiny decorative brand marks, like BrandBug. */
import type { CSSProperties } from 'react';

/**
 * A one-time "you did it" burst for a finished cleanup: the site's bugs hop out of the card's icon
 * and flutter away among pastel petals, once. Decorative only; skipped with reduced motion.
 */
// Bugs and petals fly up and to the right of the card's icon, where there is always room on screen.
const BUGS: { src: string; x: number; y: number; r: number; d: number }[] = [
  { src: '/brand/bugs/ladybug.png', x: 34, y: -78, r: -22, d: 0 },
  { src: '/brand/bugs/bee.png', x: 104, y: -64, r: 18, d: 60 },
  { src: '/brand/bugs/butterfly.png', x: 176, y: -42, r: 24, d: 120 },
  { src: '/brand/ranks/dragonfly.svg', x: -6, y: -104, r: -28, d: 90 },
  { src: '/brand/ranks/caterpillar.svg', x: 146, y: -100, r: 10, d: 150 },
  { src: '/brand/bugs/flower.png', x: 72, y: -116, r: -12, d: 30 },
];
const PETALS = ['#ffd5d9', '#fff0a8', '#c2d8ff', '#b8e198', '#b9e9dd', '#ead2f5', '#ffd5d9', '#fff0a8', '#b9e9dd', '#c2d8ff'];

export function BugCelebration({ down = false }: { down?: boolean }) {
  const flip = down ? -1 : 1;
  return (
    <span className="bug-celebration" aria-hidden="true">
      {BUGS.map((bug, n) => (
        <img key={bug.src} className="bug-celebration-bug" src={bug.src} alt="" width={24} height={24}
          style={{ '--x': `${bug.x}px`, '--y': `${bug.y * flip}px`, '--r': `${bug.r}deg`, '--d': `${bug.d}ms`, '--n': n } as CSSProperties} />
      ))}
      {PETALS.map((color, n) => {
        // Spread across the upper-right quarter: from straight up to the right.
        const angle = -Math.PI / 2 + (n / (PETALS.length - 1)) * (Math.PI / 2 + 0.35);
        const reach = 70 + (n % 3) * 30;
        return <i key={n} className="bug-celebration-petal" style={{ '--x': `${Math.round(Math.cos(angle) * reach + 10)}px`, '--y': `${Math.round(Math.sin(angle) * reach) * flip}px`, '--c': color, '--d': `${n * 25}ms` } as CSSProperties} />;
      })}
    </span>
  );
}
