import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" bundles everything needed to run the app into .next/standalone/
  // — a single server.js file. This is what the Docker runner stage uses.
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.ORCHESTRATOR_URL ?? 'http://localhost:8081'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
