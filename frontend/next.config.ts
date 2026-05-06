import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Reduce build trace size to prevent OOM during 'Collecting build traces'
  // Excludes heavy dev-only packages that are not needed in production runtime
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core*',
        'node_modules/@next/swc*',
        'node_modules/webpack*',
        'node_modules/esbuild*',
        'node_modules/terser*',
        'node_modules/rollup*',
        'node_modules/typescript*',
        'node_modules/eslint*',
      ],
    },
  },
  async redirects() {
    return [
      { source: '/kurikulum', destination: '/pembelajaran', permanent: true },
      { source: '/kurikulum/:path*', destination: '/pembelajaran/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
