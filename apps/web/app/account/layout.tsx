import type { ReactNode } from 'react';
import { PublicSiteHeader } from '@/components/public-site-header';
export const metadata = { title: 'Your account | Litterbugs', robots: { index: false, follow: false } };
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <><PublicSiteHeader activePath="/" />{children}</>;
}
