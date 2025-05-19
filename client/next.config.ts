import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverRuntimeConfig: {
    PORT: 3001
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://nocountrytest.onrender.com/api/:path*'
      }
    ];
  }
  /* config options here */
};

export default nextConfig;
