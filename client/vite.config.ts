import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { bootScreen } from './boot-screen';
import { PRODUCT_NAME } from './src/shared/config/product';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DEV_');
  // The version the screens show is package.json's, which a release sets to its tag (D-082).
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
  return {
    define: { __APP_VERSION__: JSON.stringify(version) },
    plugins: [react(), bootScreen(), {
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
