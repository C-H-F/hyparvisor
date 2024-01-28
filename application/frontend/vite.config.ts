import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import postcssConfig from './postcss.config.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api/shell': 'ws://10.0.2.207:3000/',
      '/api': 'http://10.0.2.207:3000/',
      //'/ssh': 'ws://localhost:8080/ssh',
      '^/websockify/.*': {
        target: 'ws://10.0.2.207:3000/',
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
  },
});
