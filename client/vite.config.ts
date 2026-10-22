import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { PRODUCT_NAME } from './src/shared/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DEV_');
  return {
    plugins: [react(), {
      name: 'product-title',
      transformIndexHtml: (html: string) => html.replace('%PRODUCT_TITLE%', PRODUCT_NAME),
    }],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 4402,
      strictPort: true,
      proxy: { '/api': { target: env.DEV_API_TARGET ?? 'http://localhost:8080', changeOrigin: true, ws: true } },
    },
  };
});
