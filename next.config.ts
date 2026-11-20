import type {NextConfig} from 'next';
import {PHASE_DEVELOPMENT_SERVER} from 'next/constants';

const createNextConfig = (phase: string): NextConfig => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: '**.ytimg.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev, isServer}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }

    // Prevent oversized 25MB+ monolithic app/page.js dev chunks (inline eval-source-map bloat)
    // that trigger ChunkLoadError in browser/Cloud Run previews.
    if (dev && !isServer) {
      config.devtool = false;
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            threeVendor: {
              test: /[\\/]node_modules[\\/](three|lucide-react|motion)[\\/]/,
              name: 'vendor-3d-ui',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            gameWorld: {
              test: /[\\/]game[\\/]world[\\/]/,
              name: 'game-world',
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            gameSystems: {
              test: /[\\/]game[\\/](systems|data|audio)[\\/]/,
              name: 'game-systems',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
});

export default createNextConfig;
