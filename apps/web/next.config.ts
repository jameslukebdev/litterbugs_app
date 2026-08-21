import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@litterbugs/report-contract'],
};

export default nextConfig;
