import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import postcssConfig from './postcss.config.js';

// https://vitejs.dev/config/
const backend = '10.0.0.1:3000';
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api/shell': `ws://${backend}/`,
      '/api': `http://${backend}/`,
      '^/websockify/.*': {
        target: `ws://${backend}/`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/websockify/, '/websockify/'),
      },
    },
  },
  css: {
    postcss: postcssConfig,
  },
  resolve: {
    alias: {
      ['@']: '/src',
    },
  },
  build: {
    outDir: '_dist',
    sourcemap: 'inline',
  },
});
