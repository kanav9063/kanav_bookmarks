import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ensure better-sqlite3 native module is bundled for serverless
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    '/api/**': ['./prisma/seed.db'],
    '/**': ['./prisma/seed.db'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: '*.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'video.twimg.com',
      },
    ],
  },
}

export default nextConfig
