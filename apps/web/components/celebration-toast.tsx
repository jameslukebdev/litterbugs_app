/* eslint-disable @next/next/no-img-element -- tiny decorative brand marks, like BrandBug. */
import { BugCelebration } from '@/components/bug-celebration';

/** The map's confirmation toast, dressed up for a finished workflow (a new report): bug icon, title, bug burst. */
export function CelebrationToast({ title, children, bug = '/brand/ranks/dragonfly.svg' }: { title: string; children: React.ReactNode; bug?: string }) {
  return (
    <div className="toast toast-celebrate" role="status">
      <BugCelebration />
      <img src={bug} alt="" aria-hidden="true" width={30} height={30} />
      <span><strong>{title}</strong>{children}</span>
    </div>
  );
}
