import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverRuntimeConfig: {},
  async rewrites() {
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          source: '/api/:path*',
          destination: 'https://nocountrytest.onrender.com/api/:path*'
        }
      ];
    }
    return [];
  }
  /* config options here */
};

export default nextConfig;
