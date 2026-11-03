import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { getSiteUrl } from '@/lib/env';

import { MobilePagePromotion } from '@/components/app-promotion';
import { DeviceSaveStatus } from '@/components/device-save-status';
import { WebsiteAnalytics } from '@/components/website-analytics';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: 'Litterbugs',
  description: 'Report litter and help keep your community clean.',
  icons: {
    icon: [{ url: '/brand/litterbugs-favicon-transparent.png', type: 'image/png', sizes: '256x256' }],
    shortcut: '/brand/litterbugs-favicon-transparent.png',
    apple: '/brand/litterbugs-favicon-transparent.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f5f6f7',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><DeviceSaveStatus />{children}<MobilePagePromotion /><WebsiteAnalytics config={{
        enabled: process.env.WEBSITE_ANALYTICS_ENABLED === 'true',
        production: (process.env.VERCEL_ENV ?? process.env.LITTERBUGS_DEPLOYMENT_ENV) === 'production',
        gaId: process.env.WEBSITE_GA_MEASUREMENT_ID ?? '',
        posthogKey: process.env.WEBSITE_POSTHOG_KEY ?? '',
        posthogHost: process.env.WEBSITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        clarityId: process.env.WEBSITE_CLARITY_ID ?? '',
      }} /></body>
    </html>
  );
}
