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
  other: {
    'ahrefs-site-verification': 'b81ec568ab833500263ace539a08d7937b0999ab1abf991738eb7db8e1b0d2fd',
    'msvalidate.01': '3AB93DEC1F37F1127EC6C441E7497FC5',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/brand/litterbugs-favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/litterbugs-favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/brand/litterbugs-favicon-48.png', type: 'image/png', sizes: '48x48' },
      { url: '/brand/litterbugs-favicon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/brand/litterbugs-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
