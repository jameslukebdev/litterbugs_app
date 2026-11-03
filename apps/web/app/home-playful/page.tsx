import type { Metadata } from 'next';
import HomePage from '../page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Litterbugs | Homepage styling preview',
  robots: { index: false, follow: false },
};

// Reuse the actual homepage so all copy, layout and behavior stay in sync.
export default function PlayfulHome(props: Parameters<typeof HomePage>[0]) {
  return <HomePage {...props} />;
}
