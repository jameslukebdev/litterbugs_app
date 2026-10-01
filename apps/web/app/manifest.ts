import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'Litterbugs', short_name: 'Litterbugs',
    description: 'Report litter, find cleanups, and follow your community’s progress.',
    start_url: '/', scope: '/', display: 'standalone',
    background_color: '#ffffff', theme_color: '#f5f6f7',
    icons: [
      { src: '/brand/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/app-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
