import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { getSiteUrl } from '@/lib/env';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
