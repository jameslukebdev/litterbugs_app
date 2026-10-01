import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@litterbugs/report-contract'],
  redirects: async () => [
    { source: '/how-it-works', destination: '/about', permanent: true },
    { source: '/safety', destination: '/cleanup-safety', permanent: true },
    { source: '/account/privacy', destination: '/privacy', permanent: true },
  ],
};

export default nextConfig;
