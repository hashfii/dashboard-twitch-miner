import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/bots/:path*',
        destination: 'http://127.0.0.1:5000/api/bots/:path*' // Proxy to Flask API
      }
    ]
  }
};

export default nextConfig;
