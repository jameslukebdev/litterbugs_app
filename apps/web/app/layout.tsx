import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { getSiteUrl } from '@/lib/env';

import { DeviceSaveStatus } from '@/components/device-save-status';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: 'Litterbugs',
  description: 'Report litter and help keep your community clean.',
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
      <body><DeviceSaveStatus />{children}</body>
    </html>
  );
}
