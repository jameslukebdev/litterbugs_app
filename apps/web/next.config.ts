import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@litterbugs/report-contract'],
  redirects: async () => [
    { source: '/locations', destination: '/communities', permanent: true },
    { source: '/locations/us-nc-boone', destination: '/communities/us/nc/boone', permanent: true },
    { source: '/how-it-works', destination: '/about', permanent: true },
    { source: '/safety', destination: '/cleanup-safety', permanent: true },
    { source: '/account/privacy', destination: '/privacy', permanent: true },
  ],
};

export default nextConfig;
