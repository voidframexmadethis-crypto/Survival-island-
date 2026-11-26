import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');

  return {
    root: path.resolve(rootDir, 'mobile'),
    base: './',
    publicDir: path.resolve(rootDir, 'public'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': rootDir,
        'next/image': path.resolve(rootDir, 'mobile/src/shims/next-image.tsx'),
        'next/link': path.resolve(rootDir, 'mobile/src/shims/next-link.tsx'),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
      'process.env.NEXT_PUBLIC_COASTER_TRAIN_PROVIDER_URL': JSON.stringify(
        env.NEXT_PUBLIC_COASTER_TRAIN_PROVIDER_URL ||
          env.VITE_COASTER_TRAIN_PROVIDER_URL ||
          '',
      ),
    },
    build: {
      outDir: path.resolve(rootDir, 'mobile/dist'),
      emptyOutDir: true,
      target: 'es2020',
      sourcemap: false,
      rollupOptions: {
        input: path.resolve(rootDir, 'mobile/index.html'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
    },
  };
});
