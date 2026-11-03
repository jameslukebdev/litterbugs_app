import type { ReactNode } from 'react';
import './account-theme.css';
import { PublicAccountAction } from '@/components/public-account-action';
import { PublicSiteHeader } from '@/components/public-site-header';
export const metadata = { title: 'Your account | Litterbugs', robots: { index: false, follow: false } };
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className="account-theme"><PublicSiteHeader compactMobile activePath="/" action={<div className="map-header-actions account-header-actions"><PublicAccountAction /></div>} />{children}</div>;
}
