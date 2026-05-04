import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/kurikulum', destination: '/pembelajaran', permanent: true },
      { source: '/kurikulum/:path*', destination: '/pembelajaran/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
