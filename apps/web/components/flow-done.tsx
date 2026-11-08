/* eslint-disable @next/next/no-img-element -- tiny decorative brand marks, like BrandBug. */
import type { ReactNode } from 'react';
import { BugCelebration } from '@/components/bug-celebration';

const BUGS = {
  bee: '/brand/bugs/bee.png',
  flower: '/brand/bugs/flower.png',
  caterpillar: '/brand/ranks/caterpillar.svg',
  dragonfly: '/brand/ranks/dragonfly.svg',
  butterfly: '/brand/bugs/butterfly.png',
} as const;

/**
 * The finish line of a workflow (funding paid, payouts ready, report renewed): the family's bug,
 * a short title and next step, and the one-time bug celebration.
 */
export function FlowDone({ bug, title, children, celebrate = true, icon = true }: { bug: keyof typeof BUGS; title: string; children: ReactNode; celebrate?: boolean; icon?: boolean }) {
  return (
    <section className="flow-done" data-bug={bug} role="status">
      {celebrate && <BugCelebration />}
      {/* Leave the icon off when the page header already shows the same bug. */}
      {icon && <img src={BUGS[bug]} alt="" aria-hidden="true" width={32} height={32} />}
      <div><strong>{title}</strong><p>{children}</p></div>
    </section>
  );
}
