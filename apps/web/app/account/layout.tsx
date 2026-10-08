import type { ReactNode } from 'react';
import Link from 'next/link';
import { PublicAccountAction } from '@/components/public-account-action';
import { PublicSiteHeader } from '@/components/public-site-header';
export const metadata = { title: 'Your account | Litterbugs', robots: { index: false, follow: false } };
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <><PublicSiteHeader compactMobile activePath="/" action={<div className="map-header-actions account-header-actions"><Link className="header-report-button" href="/report" aria-label="Report Litter">Report Litter</Link><PublicAccountAction /></div>} />{children}</>;
}
